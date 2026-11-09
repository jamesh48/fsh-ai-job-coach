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
    account: requireEnv('CDK_DEFAULT_ACCOUNT'),
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  databasePassword: requireEnv('POSTGRES_PASSWORD'),
  sessionSecret: requireEnv('SESSION_SECRET'),
})
