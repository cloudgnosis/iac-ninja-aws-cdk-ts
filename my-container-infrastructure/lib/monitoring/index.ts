import { Construct } from 'constructs';
import {
    IAlarmActionStrategy,
    MonitoringFacade,
    NoopAlarmActionStrategy,
    SnsAlarmActionStrategy
} from 'cdk-monitoring-constructs';
import { ITopic } from 'aws-cdk-lib/aws-sns';

export interface MonitoringConfig {
    readonly dashboardName: string;
    readonly defaultAlarmNamePrefix?: string;
    readonly defaultAlarmTopic?: ITopic;
}

export interface MonitoringContext {
    readonly handler: MonitoringFacade;
    readonly defaultAlarmTopic?: ITopic;
    readonly defaultAlarmNamePrefix?: string;
}

export const initMonitoring = function(scope: Construct, config: MonitoringConfig): MonitoringContext {

    let snsAlarmStrategy: IAlarmActionStrategy = new NoopAlarmActionStrategy;
    if (config.defaultAlarmTopic) {
        snsAlarmStrategy = new SnsAlarmActionStrategy({ onAlarmTopic: config.defaultAlarmTopic });
    }
    const defaultAlarmNamePrefix = config.defaultAlarmNamePrefix ?? config.dashboardName;
    return {
        handler: new MonitoringFacade(scope, config.dashboardName, {
            alarmFactoryDefaults: {
                actionsEnabled: true,
                action: snsAlarmStrategy,
                alarmNamePrefix: defaultAlarmNamePrefix,
            },
        }),
        defaultAlarmTopic: config.defaultAlarmTopic,
        defaultAlarmNamePrefix,
    }
}
