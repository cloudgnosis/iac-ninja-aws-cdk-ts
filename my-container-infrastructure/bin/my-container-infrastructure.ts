import { App, Stack } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

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
