import { Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { initMonitoring, MonitoringConfig } from '../lib/monitoring';

test('Init monitoring of stack, with only defaults', () => {
    const stack = new Stack();

    const monitoringConfig: MonitoringConfig = {
        dashboardName: 'test-monitoring',
    }
    const monitoring = initMonitoring(stack, monitoringConfig);

    const template = Template.fromStack(stack);
    console.log(JSON.stringify(template.toJSON(), null, 2));
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: monitoringConfig.dashboardName
    });
});
