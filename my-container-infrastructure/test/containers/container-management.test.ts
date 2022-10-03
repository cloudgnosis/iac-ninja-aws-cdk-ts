import { Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import {
    addCluster,
    addLoadBalancedService,
    addTaskDefinitionWithContainer,
    ClusterConfig,
    ContainerConfig,
    setServiceScaling,
    TaskConfig
} from '../../lib/containers/container-management';
import { Cluster, TaskDefinition } from 'aws-cdk-lib/aws-ecs';

test('ECS cluster is defined with existing vpc', () => {
    // Test setup
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');

    // Test code
    const cluster = addCluster(stack, 'test-cluster', {vpc});

    // Check result
    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::ECS::Cluster', 1);

    expect(cluster.vpc).toEqual(vpc);
});

test('Check that container insights will be enabled when that option is set', () => {
    // Test setup
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');
    const config: ClusterConfig = {
        vpc,
        enableContainerInsights: true
    };

    // Test code
    const cluster = addCluster(stack, 'test-cluster', config);

    // Check result
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::Cluster', {
        ClusterSettings: Match.arrayWith([
            Match.objectEquals({
                Name: 'containerInsights',
                Value: 'enabled',
            }),
        ]),
    });
});


test('ECS Fargate task definition defined', () => {
    // Test setup
    const stack = new Stack();
    const cpuval = 512;
    const memval = 1024;
    const familyval = 'test';
    const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
    const imageName = 'httpd';
    const containerCfg: ContainerConfig = { dockerHubImage: imageName, tcpPorts: [80] };

    // Test code
    const taskdef = addTaskDefinitionWithContainer(stack, 'test-taskdef', taskCfg, containerCfg);

    // Check result
    const template = Template.fromStack(stack);
    
    expect(taskdef.isFargateCompatible).toBeTruthy();
    expect(stack.node.children.includes(taskdef)).toBeTruthy();

    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        RequiresCompatibilities: [ 'FARGATE' ],
        Cpu: cpuval.toString(),
        Memory: memval.toString(),
        Family: familyval,
    });

});

test('Container definition added to task definition', () => {
    // Test setup
    const stack = new Stack();
    const cpuval = 512;
    const memval = 1024;
    const familyval = 'test';
    const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
    const imageName = 'httpd';
    const containerCfg: ContainerConfig = { dockerHubImage: imageName, tcpPorts: [80] };

    // Test code
    const taskdef = addTaskDefinitionWithContainer(stack, 'test-taskdef', taskCfg, containerCfg);

    // Check result
    const template = Template.fromStack(stack);
    const containerDef = taskdef.defaultContainer;

    expect(taskdef.defaultContainer).toBeDefined();
    expect(containerDef?.imageName).toEqual(imageName); // Works from v2.11 of aws-cdk-lib
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
        ContainerDefinitions: Match.arrayWith([
            Match.objectLike({
                Image: imageName,
            }),
        ]),
    });
});

describe('Test service creation options', () => {
    let stack: Stack;
    let cluster: Cluster;
    let taskdef: TaskDefinition;

    beforeEach(() => {
        // Test setup
        stack = new Stack();
        const vpc = new Vpc(stack, 'vpc');
        cluster = addCluster(stack, 'test-cluster', {vpc});
    
        const cpuval = 512;
        const memval = 1024;
        const familyval = 'test';
        const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
        const imageName = 'httpd';
        const containerCfg: ContainerConfig = { dockerHubImage: imageName, tcpPorts: [80] };
        taskdef = addTaskDefinitionWithContainer(stack, 'test-taskdef', taskCfg, containerCfg);
    });

    test('Fargate load-balanced service created, with provided mandatory properties only', () => {    
        const port = 80;
        const desiredCount = 1;
    
        // Test code
        const service = addLoadBalancedService(stack, 'test-service', cluster, taskdef, port, desiredCount);
    
        // Check result
        const sgCapture = new Capture();
        const template = Template.fromStack(stack);
    
        expect(service.cluster).toEqual(cluster);
        expect(service.taskDefinition).toEqual(taskdef);
    
        template.resourceCountIs('AWS::ECS::Service', 1);
        template.hasResourceProperties('AWS::ECS::Service', {
            DesiredCount: desiredCount,
            LaunchType: 'FARGATE',
            NetworkConfiguration: Match.objectLike({
                AwsvpcConfiguration: Match.objectLike({
                    AssignPublicIp: 'DISABLED',
                    SecurityGroups: Match.arrayWith([sgCapture]),
                }),
            }),
        });

        template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
            Type: 'application',
            Scheme: 'internet-facing',
        });
    
        //template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            SecurityGroupIngress: Match.arrayWith([
                Match.objectLike({
                    CidrIp: '0.0.0.0/0',
                    FromPort: port,
                    IpProtocol: 'tcp',
                }),
            ]),
        });
    }); 

    test('Fargate load-balanced service created, without public access', () => {    
        const port = 80;
        const desiredCount = 1;
    
        // Test code
        const service = addLoadBalancedService(stack, 'test-service', cluster, taskdef, port, desiredCount, false);
    
        // Check result
        const template = Template.fromStack(stack);

        template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
        template.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
            Type: 'application',
            Scheme: 'internal',
        });
    }); 

    test('Scaling settings of load balancer', () => {
        const port = 80;
        const desiredCount = 2;
        const service = addLoadBalancedService(stack, 'test-service', cluster, taskdef, port, desiredCount, false);
    
        // Test code
        const config = {
            minCount: 1,
            maxCount: 5,
            scaleCpuTarget: { percent: 50 },
            scaleMemoryTarget: { percent: 50 },
        };

        setServiceScaling(service.service, config);
        
    
        // Check result
        const scaleResource = new Capture();
        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::ApplicationAutoScaling::ScalableTarget', 1);
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
            MaxCapacity: config.maxCount,
            MinCapacity: config.minCount,
            ResourceId: scaleResource,
            ScalableDimension: 'ecs:service:DesiredCount',
            ServiceNamespace: 'ecs',
        });

        template.resourceCountIs('AWS::ApplicationAutoScaling::ScalingPolicy', 2);
        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: Match.objectLike({
                PredefinedMetricSpecification: Match.objectEquals({
                    PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
                }),
                TargetValue: config.scaleCpuTarget.percent,
            }),
        });

        template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalingPolicy', {
            PolicyType: 'TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration: Match.objectLike({
                PredefinedMetricSpecification: Match.objectEquals({
                    PredefinedMetricType: 'ECSServiceAverageMemoryUtilization',
                }),
                TargetValue: config.scaleMemoryTarget.percent,
            }),
        });
    });

});

