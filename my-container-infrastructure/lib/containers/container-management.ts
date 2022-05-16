import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export const addCluster = function(scope: Construct, id: string, vpc: IVpc): Cluster {
    return new Cluster(scope, id, {
        vpc,
    });
}
