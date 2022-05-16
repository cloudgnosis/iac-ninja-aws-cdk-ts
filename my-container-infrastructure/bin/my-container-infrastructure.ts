import { App, Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import {
    addCluster,
    addTaskDefinitionWithContainer,
    ContainerConfig,
    TaskConfig
} from '../lib/containers/container-management';

const app = new App();
const stack = new Stack(app, 'my-container-infrastructure', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
});

const vpc = Vpc.fromLookup(stack, 'vpc', {
    isDefault: true,
});

const id = 'my-test-cluster';
addCluster(stack, id, vpc);

const taskConfig: TaskConfig = { cpu: 512, memoryLimitMB: 1024, family: 'webserver' };
const containerConfig: ContainerConfig = { dockerHubImage: 'httpd' };

addTaskDefinitionWithContainer(stack, `taskdef-${taskConfig.family}`, taskConfig, containerConfig);
