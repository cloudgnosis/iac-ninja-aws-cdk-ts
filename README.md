# How to become an infrastructure-as-code ninja, using AWS CDK

This is a code repository with the code from the article series _How to become an infrastructure-as-code ninja, using AWS CDK_ at [Tidy Cloud AWS](https://tidycloudaws.com/).

The article series uses Typescript as an example language. However, there are repositories with example code
for multiple languages. 

* https://github.com/cloudgnosis/iac-ninja-aws-cdk-ts
* https://github.com/cloudgnosis/iac-ninja-aws-cdk-python
* https://github.com/cloudgnosis/iac-ninja-aws-cdk-go

The repositories will contain all the code examples from the articles series, implemented in different languages with the AWS CDK. 

## Repository organisation

As the code in the article series for the most part is built up step-by-step, I have chosen to tag the content
for each step in the **main** branch according to the following model:

- partN_start   - initial state at the start of article part N
- partN_step1   - state after first step in article part N
- partN_stepX   - state after step X in article part N
- partN_final   - state for the final result from article part N

This typically means that the final tag for one part at the same stage as the start tag of the next article.
How many steps there are in between the start and final stages varies from article to article.

