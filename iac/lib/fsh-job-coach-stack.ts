import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import * as iam from 'aws-cdk-lib/aws-iam'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import type { Construct } from 'constructs'

const PORT = 3000

interface FshJobCoachStackProps extends cdk.StackProps {
  databasePassword: string
  sessionSecret: string
  databaseName?: string
  aws_env: {
    AWS_CLUSTER_ARN: string
    AWS_DEFAULT_SG: string
    AWS_VPC_ID: string
    ALB_LISTENER_ARN: string
  }
}

export class FshJobCoachStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FshJobCoachStackProps) {
    super(scope, id, props)

    const postgresIp = cdk.Fn.importValue('PostgresInstancePrivateIp')
    const dbName = props.databaseName ?? 'fsh_job_coach'
    const databaseUrl = `postgresql://postgres:${props.databasePassword}@${postgresIp}:5432/${dbName}`

    const vpc = ec2.Vpc.fromLookup(this, 'jh-imported-vpc', {
      vpcId: props.aws_env.AWS_VPC_ID,
    })

    const cluster = ecs.Cluster.fromClusterAttributes(
      this,
      'jh-imported-cluster',
      {
        clusterName: 'jh-e1-ecs-cluster',
        clusterArn: props.aws_env.AWS_CLUSTER_ARN,
        securityGroups: [
          ec2.SecurityGroup.fromSecurityGroupId(
            this,
            'imported-default-sg',
            props.aws_env.AWS_DEFAULT_SG,
          ),
        ],
        vpc,
      },
    )

    const taskRole = iam.Role.fromRoleName(
      this,
      'jh-ecs-task-definition-role',
      'jh-ecs-task-definition-role',
    )
    const executionRole = iam.Role.fromRoleName(
      this,
      'jh-ecs-task-execution-role',
      'jh-ecs-task-execution-role',
    )

    const taskDef = new ecs.FargateTaskDefinition(this, 'fsh-job-coach-task', {
      taskRole,
      executionRole,
    })

    taskDef.addContainer('fsh-job-coach-container', {
      image: ecs.ContainerImage.fromAsset('../'),
      command: [
        'sh',
        '-c',
        `npx prisma migrate deploy && npx next start -p ${PORT}`,
      ],
      environment: {
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: props.sessionSecret,
        NODE_ENV: 'production',
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'fsh-job-coach',
        logRetention: RetentionDays.FIVE_DAYS,
      }),
      portMappings: [{ containerPort: PORT, hostPort: PORT }],
    })

    const service = new ecs.FargateService(this, 'fsh-job-coach-service', {
      cluster,
      taskDefinition: taskDef,
      assignPublicIp: true,
      desiredCount: 1,
      capacityProviderStrategies: [
        { capacityProvider: 'FARGATE_SPOT', weight: 1 },
      ],
      enableExecuteCommand: true,
    })

    const listener = elbv2.ApplicationListener.fromLookup(
      this,
      'imported-listener',
      {
        listenerArn: props.aws_env.ALB_LISTENER_ARN,
      },
    )

    const targetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'fsh-job-coach-tg',
      {
        port: PORT,
        protocol: elbv2.ApplicationProtocol.HTTP,
        targets: [service],
        vpc,
        healthCheck: {
          path: '/api/healthcheck',
          healthyHttpCodes: '200',
          unhealthyThresholdCount: 2,
          healthyThresholdCount: 4,
          interval: cdk.Duration.seconds(30),
          port: PORT.toString(),
          timeout: cdk.Duration.seconds(10),
        },
      },
    )

    listener.addTargetGroups('fsh-listener-tg', {
      targetGroups: [targetGroup],
      priority: 40,
      conditions: [elbv2.ListenerCondition.hostHeaders(['lmkn.net'])],
    })

    const postgresSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'PostgresSecurityGroup',
      cdk.Fn.importValue('PostgresInstanceSecurityGroupId'),
    )

    const ecsSecurityGroup = service.connections.securityGroups[0]
    postgresSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow FSH Job Coach ECS tasks to connect to Postgres',
    )
  }
}
