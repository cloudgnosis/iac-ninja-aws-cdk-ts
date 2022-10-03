import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { initMonitoring, MonitoringConfig } from '../lib/monitoring';
import { addCluster } from '../lib/containers/container-management';

test('Init monitoring of stack, with only defaults', () => {
    const stack = new Stack();

    const monitoringConfig: MonitoringConfig = {
        dashboardName: 'test-monitoring',
    }
    const monitoring = initMonitoring(stack, monitoringConfig);

    const template = Template.fromStack(stack);
    //console.log(JSON.stringify(template.toJSON(), null, 2));
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: monitoringConfig.dashboardName
    });
});

test('Init monitoring of stack, with SNS topic for alarms', () => {
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');
    const cluster = addCluster(stack, 'test-cluster', {vpc});
    const alarmTopic = new Topic(stack, 'alarm-topic');

    const dashboardName = 'test-monitoring';
    const monitoringConfig: MonitoringConfig = {
        dashboardName,
        defaultAlarmTopic: alarmTopic,
    };

    const monitoring = initMonitoring(stack, monitoringConfig);

    expect(monitoring.defaultAlarmTopic).toEqual(alarmTopic);
    expect(monitoring.defaultAlarmNamePrefix).toEqual(dashboardName);
});

test('Init monitoring of stack, with SNS topic for alarms and alarm prefix set', () => {
    const stack = new Stack();
    const vpc = new Vpc(stack, 'vpc');
    const cluster = addCluster(stack, 'test-cluster', {vpc});
    const alarmTopic = new Topic(stack, 'alarm-topic');

    const dashboardName = 'test-monitoring';
    const alarmPrefix = 'my-prefix';
    const monitoringConfig: MonitoringConfig = {
        dashboardName,
        defaultAlarmTopic: alarmTopic,
        defaultAlarmNamePrefix: alarmPrefix,
    };

    const monitoring = initMonitoring(stack, monitoringConfig);

    expect(monitoring.defaultAlarmTopic).toEqual(alarmTopic);
    expect(monitoring.defaultAlarmNamePrefix).toEqual(alarmPrefix);
});
