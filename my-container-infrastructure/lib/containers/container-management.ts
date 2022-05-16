import { IVpc, Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import {
    Cluster,
    ContainerImage,
    FargateService,
    FargateTaskDefinition,
    LogDriver,
    TaskDefinition
} from 'aws-cdk-lib/aws-ecs';
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
    taskdef.addContainer(`container-${containerConfig.dockerHubImage}`, { image, logging: logdriver });

    return taskdef;
};

export const addService = 
function(scope: Construct, 
         id: string, 
         cluster: Cluster, 
         taskDef: FargateTaskDefinition, 
         port: number, 
         desiredCount: number, 
         assignPublicIp?: boolean,
         serviceName?: string): FargateService {
    const sg = new SecurityGroup(scope, `${id}-security-group`, {
        description: `Security group for service ${serviceName ?? ''}`,
        vpc: cluster.vpc,
    });
    sg.addIngressRule(Peer.anyIpv4(), Port.tcp(port));

    const service = new FargateService(scope, id, {
        cluster,
        taskDefinition: taskDef,
        desiredCount,
        serviceName,
        securityGroups: [sg],
        circuitBreaker: {
            rollback: true,
        },
        assignPublicIp,
    });

    return service;
};
