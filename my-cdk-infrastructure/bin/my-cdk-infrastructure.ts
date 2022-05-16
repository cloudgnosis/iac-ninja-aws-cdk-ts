import {App, Stack} from 'aws-cdk-lib';
import {Instance, InstanceClass, InstanceSize, InstanceType, MachineImage, Vpc } from 'aws-cdk-lib/aws-ec2';


const app = new App();
const stack = new Stack(app, 'my-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const vpc = Vpc.fromLookup(stack, 'my-vpc', {
  isDefault: true,
});

const instance = new Instance(stack, 'my-ec2', {
  instanceType: InstanceType.of(InstanceClass.T2, InstanceSize.MICRO),
  machineImage: MachineImage.latestAmazonLinux(),
  vpc,
});
