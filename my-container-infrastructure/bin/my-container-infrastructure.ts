import { App, Duration, Stack } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { OpsItemCategory, OpsItemSeverity } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { IVpc, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { IAlarmActionStrategy, MultipleAlarmActionStrategy, OpsItemAlarmActionStrategy, SnsAlarmActionStrategy } from 'cdk-monitoring-constructs';
import { 
  addCluster, 
  addLoadBalancedService,
  addTaskDefinitionWithContainer, 
  ClusterConfig,
  ContainerConfig, 
  setServiceScaling, 
  TaskConfig 
} from '../lib/containers/container-management';
import { initMonitoring, MonitoringConfig } from '../lib/monitoring';

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
const clusterConfig: ClusterConfig = { vpc, enableContainerInsights: true };
const cluster = addCluster(stack, id, clusterConfig);

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

const alarmTopic = new Topic(stack, 'alarm-topic', {
  displayName: 'Alarm topic',
});
const monitoring = initMonitoring(stack, {
  dashboardName: 'monitoring',
  defaultAlarmTopic: alarmTopic,
});

const alarmActions: IAlarmActionStrategy[] = [
  new OpsItemAlarmActionStrategy(OpsItemSeverity.MEDIUM, OpsItemCategory.PERFORMANCE),
];
if (monitoring.defaultAlarmTopic) {
  alarmActions.push(new SnsAlarmActionStrategy({
    onAlarmTopic: monitoring.defaultAlarmTopic,
    onOkTopic: monitoring.defaultAlarmTopic,
  }));
}

monitoring.handler.addMediumHeader('Test App monitoring');
monitoring.handler.monitorFargateService({
  fargateService: service,
  humanReadableName: 'My test service',

  addRunningTaskCountAlarm: {
    alarm1: {
      maxRunningTasks: 2,
      comparisonOperatorOverride: ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      period: Duration.minutes(5),
      actionOverride: new MultipleAlarmActionStrategy(alarmActions),
    }
  }
});

const alarmEmail = 'hello@example.com';
alarmTopic.addSubscription(new EmailSubscription(alarmEmail));
