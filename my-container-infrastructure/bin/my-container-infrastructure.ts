import { App, Stack } from 'aws-cdk-lib';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import { 
  addCluster, 
  addLoadBalancedService,
  addTaskDefinitionWithContainer, 
  ContainerConfig, 
  setServiceScaling, 
  TaskConfig 
} from '../lib/containers/container-management';
import { initMonitoring } from '../lib/monitoring';

const app = new App();
const stack = new Stack(app, 'my-container-infrastructure', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

let vpc: IVpc;

let vpcName = app.node.tryGetContext('vpcname');
if (vpcName) {
  vpc = Vpc.fromLookup(stack, 'vpc', {
    vpcName,
  });
} else {
  vpc = new Vpc(stack, 'vpc', {
    vpcName: 'my-vpc',
    natGateways: 1,
    maxAzs: 2,
  });
}

const id = 'my-test-cluster';
const cluster = addCluster(stack, id, vpc);

const taskConfig: TaskConfig = { cpu: 512, memoryLimitMB: 1024, family: 'webserver' };
const containerConfig: ContainerConfig = { dockerHubImage: 'httpd', tcpPorts: [80] };
const taskdef = addTaskDefinitionWithContainer(stack, `taskdef-${taskConfig.family}`, taskConfig, containerConfig);
const service = addLoadBalancedService(stack, `service-${taskConfig.family}`, cluster, taskdef, 80, 2, true);
setServiceScaling(service.service, {
  minCount: 1,
  maxCount: 4,
  scaleCpuTarget: { percent: 50 },
  scaleMemoryTarget: { percent: 70 },
});

const monitoring = initMonitoring(stack, {
  dashboardName: 'monitoring',
});

monitoring.handler.addMediumHeader('Test App monitoring');
