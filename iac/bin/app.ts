#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { FshJobCoachStack } from '../lib/fsh-job-coach-stack'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const app = new cdk.App()

new FshJobCoachStack(app, 'FshJobCoachStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  databasePassword: requireEnv('POSTGRES_PASSWORD'),
  sessionSecret: requireEnv('SESSION_SECRET'),
  aws_env: {
    AWS_CLUSTER_ARN: requireEnv('AWS_CLUSTER_ARN'),
    AWS_DEFAULT_SG: requireEnv('AWS_DEFAULT_SG'),
    AWS_VPC_ID: requireEnv('AWS_VPC_ID'),
    ALB_LISTENER_ARN: requireEnv('ALB_LISTENER_ARN'),
  },
})
