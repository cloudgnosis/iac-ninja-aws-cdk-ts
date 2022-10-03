import { Construct } from 'constructs';
import { MonitoringFacade } from 'cdk-monitoring-constructs';

export interface MonitoringConfig {
    readonly dashboardName: string;
}

export interface MonitoringContext {
    readonly handler: MonitoringFacade;
}

export const initMonitoring = function(scope: Construct, config: MonitoringConfig): MonitoringContext {

    return {
        handler: new MonitoringFacade(scope, config.dashboardName),
    }
}
