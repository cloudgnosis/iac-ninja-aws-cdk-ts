import { Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import {
    addCluster,
    addService,
    addTaskDefinitionWithContainer,
    ContainerConfig,
    TaskConfig
} from '../../lib/containers/container-management';

test('ECS cluster is defined with existing vpc', () => {
    // Test setup
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');

    // Test code
    const cluster = addCluster(stack, 'test-cluster', vpc);

    // Check result
    const template = Template.fromStack(stack);
    
    template.resourceCountIs('AWS::ECS::Cluster', 1);

    expect(cluster.vpc).toEqual(vpc);
});

test('ECS Fargate task definition defined', () => {
    // Test setup
    const stack = new Stack();
    const cpuval = 512;
    const memval = 1024;
    const familyval = 'test';
    const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
    const imageName = 'httpd';
    const containerCfg: ContainerConfig = { dockerHubImage: imageName };

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

test('Fargate service created, with provided mandatory properties only', () => {
    // Test setup
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');
    const cluster = addCluster(stack, 'test-cluster', vpc);

    const cpuval = 512;
    const memval = 1024;
    const familyval = 'test';
    const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
    const imageName = 'httpd';
    const containerCfg: ContainerConfig = { dockerHubImage: imageName };
    const taskdef = addTaskDefinitionWithContainer(stack, 'test-taskdef', taskCfg, containerCfg);

    const port = 80;
    const desiredCount = 1;

    // Test code
    const service = addService(stack, 'test-service', cluster, taskdef, port, desiredCount);

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

    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
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

test('Container definition added to task definition', () => {
    // Test setup
    const stack = new Stack();
    const cpuval = 512;
    const memval = 1024;
    const familyval = 'test';
    const taskCfg: TaskConfig = { cpu: cpuval, memoryLimitMB: memval, family: familyval };
    const imageName = 'httpd';
    const containerCfg: ContainerConfig = { dockerHubImage: imageName };

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
