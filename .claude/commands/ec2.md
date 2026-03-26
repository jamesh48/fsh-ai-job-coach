You are helping the user connect to the Postgres EC2 instance for the FSH AI Job Coach project via AWS SSM Session Manager. Follow these steps:

## 1. Find the instance ID

First, check if `POSTGRES_INSTANCE_ID` is already set in the project's `.env` file:

```bash
grep POSTGRES_INSTANCE_ID .env
```

If found, use that value and skip to step 2.

If not found, discover it via AWS:

```bash
aws ec2 describe-instances \
  --region us-east-1 \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].{InstanceId:InstanceId,Name:Tags[?Key=='Name']|[0].Value,PrivateIp:PrivateIpAddress,State:State.Name}" \
  --output table
```

Identify the instance with "postgres" in its Name tag. If there is any ambiguity, show the table to the user and ask them to confirm.

Once identified, append the instance ID to `.env` so it's cached for future runs:

```bash
printf "\nPOSTGRES_INSTANCE_ID=<INSTANCE_ID>\n" >> .env
```

## 2. Verify SSM availability

Before starting the session, confirm the instance is reachable via SSM:

```bash
aws ssm describe-instance-information \
  --region us-east-1 \
  --filters "Key=InstanceIds,Values=<INSTANCE_ID>" \
  --query "InstanceInformationList[0].{InstanceId:InstanceId,PingStatus:PingStatus,PlatformType:PlatformType}" \
  --output table
```

If `PingStatus` is not `Online`, report this to the user — the SSM agent may not be running or the instance may lack the required IAM role. Do not proceed.

## 3. Output the connect command

Do NOT run the session command yourself — it requires an interactive TTY. Instead, output the following for the user to run in a separate terminal:

```
Run this in a separate terminal:

  aws ssm start-session --region us-east-1 --target <INSTANCE_ID>

Once connected:
  sudo -u postgres psql fsh_job_coach
```

## Notes
- Requires `aws` CLI and the SSM plugin (`session-manager-plugin`) to be installed locally
- The instance must have the `AmazonSSMManagedInstanceCore` IAM policy attached
- No SSH key or open inbound port needed — SSM tunnels over HTTPS
