import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, LogDriver, TaskDefinition, Protocol } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export const addCluster = function(scope: Construct, id: string, vpc: IVpc): Cluster {
    return new Cluster(scope, id, {
        vpc,
    });
}

export interface TaskConfig {
    readonly cpu: 256 | 512 | 1024 | 2048 | 4096;
    readonly memoryLimitMB: number;
    readonly family: string;
}

export interface ContainerConfig {
    readonly dockerHubImage: string;
    readonly tcpPorts: number[];
}

export const addTaskDefinitionWithContainer = 
function(scope: Construct, id: string, taskConfig: TaskConfig, containerConfig: ContainerConfig): TaskDefinition {
    const taskdef = new FargateTaskDefinition(scope, id, {
        cpu: taskConfig.cpu,
        memoryLimitMiB: taskConfig.memoryLimitMB,
        family: taskConfig.family,
    });

    const image = ContainerImage.fromRegistry(containerConfig.dockerHubImage);
    const logdriver = LogDriver.awsLogs({ 
        streamPrefix: taskConfig.family,
        logRetention: RetentionDays.ONE_DAY,
    });
    const containerDef = taskdef.addContainer(`container-${containerConfig.dockerHubImage}`, { image, logging: logdriver });
    for (const port of containerConfig.tcpPorts) {
        containerDef.addPortMappings({ containerPort: port, protocol: Protocol.TCP });
    }

    return taskdef;
};

export const addLoadBalancedService = 
function(scope: Construct, 
         id: string, 
         cluster: Cluster, 
         taskDef: FargateTaskDefinition, 
         port: number, 
         desiredCount: number, 
         publicEndpoint?: boolean,
         serviceName?: string): ApplicationLoadBalancedFargateService {

    const service = new ApplicationLoadBalancedFargateService(scope, id, {
        cluster,
        taskDefinition: taskDef,
        desiredCount,
        serviceName,
        circuitBreaker: {
            rollback: true,
        },
        publicLoadBalancer: publicEndpoint,
        listenerPort: port,
    });

    return service;
};

