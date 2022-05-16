import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, FargateTaskDefinition, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
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
    taskdef.addContainer(`container-${containerConfig.dockerHubImage}`, { image, });

    return taskdef;
};
