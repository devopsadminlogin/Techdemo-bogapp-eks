# Techdemo-blog EKS Deployment Documentation
_The challenge involves deploying a Three-Tier Web Application using ReactJS, NodeJS, and MongoDB, with deployment on AWS EKS.
Participants are encouraged to deploy the application, add creative enhancements, and submit a Pull Request (PR). Merged PRs will earn
exciting prizes!_



## Table of contents

- [1. Introduction](#1-introduction)
- [2. Prerequisites](#2-prerequisites)
- [3. EC2 Setup](#3-ec2-setup)
- [4. Install AWS CLI v2](#4-install-aws-cli-v2)
- [5. Install Docker](#5-install-docker)
- [6. Install kubectl](#6-install-kubectl)
- [7. Install eksctl](#7-install-eksctl)
- [8. Setup EKS Cluster](#8-setup-eks-cluster)
	- [8.1 Create Namespace:](#8.1-create-namespace)
	- [8.2. Secrets Configuration](#8.2-secrets-configuration)
- [9. Kubernetes Deployments](#9-kubernetes-deployments)
	- [9.1 MongoDB Configuration](#901--mongodb-configuration)
	- [9.2 Backend Deployment](#92-backend-deployment)
	- [9.3 Frontend Deployment](#93-frontend-deployment)
	- [9.4 Network Policy Configuration](#114-network-policy-configuration)
- [10. Issues and Resolutions](#10-issues-and-resolutions)
	- [Issue 10.1: Liveness Probe Fails - Container Restarting](#issue-101-liveness-probe-fails---container-restarting)
	- [Issue 10.2: Server Not Accessible After Update](#issue-102-server-not-accessible-after-update)
	- [Issue 10.3: Unable to Connect to MongoDB Atlas](#issue-103-unable-to-connect-to-mongodb-atlas)
		- [1. MongoDB URI Verification:](#1-mongodb-uri-verification)
		- [2. Credentials Check:](#2-credentials-check)
		- [3. Network Configuration:](#3-network-configuration)
		- [4. MongoDB Atlas IP Whitelist:](#4-mongodb-atlas-ip-whitelist)
---

## 1. Introduction
This document provides detailed information on deploying a Node.js backend application with MongoDB Atlas on a Kubernetes cluster. It covers prerequisites, issues encountered, resolutions, and configuration details.

---
## 2. Prerequisites
Ensure the following prerequisites are met before proceeding with the deployment:
* Access to a Kubernetes cluster (e.g., AWS EKS).
* Docker images for the Node.js backend and MongoDB are pushed to a container registry (e.g., Amazon ECR).
* MongoDB Atlas cluster is set up, and connection details are available
---
## 3. EC2 Setup
* Launch an Ubuntu instance in your favorite region.
* SSH into the instance from your local machine.
```
# Example SSH command
ssh -i your-key.pem ubuntu@your-ec2-instance-ip
```
---
## 4. Install AWS CLI v2
* Download and install AWS CLI v2.
```
# Example installation commands
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install unzip
unzip awscliv2.zip
sudo ./aws/install -i /usr/local/aws-cli -b /usr/local/bin --update
```
* Configure AWS CLI with the generated credentials.
```
aws configure
```
---
## 5. Install Docker
* Update package information and install Docker.
```
# Example installation commands
sudo apt-get update
sudo apt install docker.io
```
* Check Docker installation.
* Grant permissions for Docker.
```
docker ps
sudo chown $USER /var/run/docker.sock
```
---
## 6. Install kubectl
Download and install kubectl.
```
# Example installation commands
curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.19.6/2021-01-05/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin
```
* Verify kubectl installation.
```
kubectl version --short --client
```
---
## 7. Install eksctl
Download and install eksctl.
```
# Example installation commands
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```
* Verify eksctl installation.
```
eksctl version
```
---
# 8. Setup EKS Cluster
Create an EKS cluster.
```
eksctl create cluster --name techdemo-blog-app-cluster --region us-west-2 --node-type t2.medium --nodes-min 2 --nodes-max 2
```
* Update kubeconfig to include the EKS cluster.
```
aws eks update-kubeconfig --region us-west-2 --name techdemo-blog-app-cluster
```
* Verify nodes in the EKS cluster.
```
kubectl get nodes 
```

### 8.1 Create Namespace:
The `kubectl create namespace workshop` command is used to create a new Kubernetes namespace named "workshop." Namespaces provide a way to scope and segregate resources within a Kubernetes cluster.

```
kubectl create namespace workshop
kubectl config set-context --current --namespace workshop
```

### 8.2 Secrets Configuration
The following secrets are used for secure configuration: `vim secrats.yml`
```
apiVersion: v1
kind: Secret
metadata:
  namespace: workshop
  name: mongo-sec
type: Opaque
data:
  MONGO_INITDB_ROOT_USERNAME: YWRtaW4=
  MONGO_INITDB_ROOT_PASSWORD: U3BlZWRAMTIz 
  MONGO_USERNAME: dGVjaGRlbW9hZG1pbg== 
  MONGO_PASSWORD: VGVjaGJsb2c= 
  MONGO_DB: dGVjaGRlbW9EYg==  
  MONGO_URI: bW9uZ29kYjovL2FkbWluMTIzQHRlY2hkZW1vRGI6MjcwMTcvd29ya3Nob3A=
  ```
  ---
  ## 9. Kubernetes Deployments
  ### 9.1  MongoDB Configuration
 * MongoDB Deployment (`mongo-deployment.yml`): CMD: `vim mongodb-deploy.yml`
```
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: workshop
  name: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:4.4.6
        command:
            - "numactl"
            - "--interleave=all"
            - "mongod"
            - "--wiredTigerCacheSizeGB"
            - "0.1"
            - "--bind_ip"
            - "0.0.0.0"
        ports:
        - containerPort: 27017
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        env:
          - name: MONGO_INITDB_ROOT_USERNAME
            valueFrom:
              secretKeyRef:
                name: mongo-sec 
                key: MONGO_INITDB_ROOT_USERNAME
          - name: MONGO_INITDB_ROOT_PASSWORD
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_INITDB_ROOT_PASSWORD
          - name: MONGO_USERNAME
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_USERNAME
          - name: MONGO_PASSWORD
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_PASSWORD
          - name: MONGO_DB
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_DB
```
* MongoDB Service file (`vim mongo-service.yaml`):
```
apiVersion: v1
kind: Service
metadata:
  namespace: workshop
  name: mongodb-svc
spec:
  selector:
    app: mongodb
  ports:
  - name: mongodb-svc
    protocol: TCP
    port: 27017
    targetPort: 27017
```
* MongoDB Deployment
```
kubectl apply -f mongo-deployment.yml
kubectl apply -f mongo-service.yaml
```
---
### 9.2 Backend Deployment
* Node.js Backend Deployment (`vim backend-deployment.yml`):
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: techdemo-backend
  namespace: workshop
  labels:
    role: techdemo-backend
    env: demo
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 25%
  selector:
    matchLabels:
      role: techdemo-backend
  template:
    metadata:
      labels:
        role: techdemo-backend
    spec:
      containers:
      - name: techdemo-backend
        image: public.ecr.aws/f5n5l7s0/techdome-application-backend:latest
        imagePullPolicy: IfNotPresent
        env:
          - name: MONGO_URI
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_URI
          - name: MONGO_USERNAME
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_USERNAME
          - name: MONGO_PASSWORD
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_PASSWORD
          - name: MONGO_DATA
            valueFrom:
              secretKeyRef:
                name: mongo-sec
                key: MONGO_DB 
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /ok
            port: 8080
          initialDelaySeconds: 2
          periodSeconds: 5
        readinessProbe:
          httpGet:
             path: /ok
             port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          successThreshold: 1
```
* Node.js Backend Service (`backend-service.yml`):
```apiVersion: v1
kind: Service
metadata:
  name: techdemo-backend
  namespace: workshop
spec:
  ports:

port: 8080
protocol: TCP
type: LoadBalancer
selector:
role: techdemo-backend
```
---
### 9.3 Frontend Deployment
React Frontend Deploye ( `vim frontend-deployment.yaml`)
```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: workshop
  labels:
    role: frontend
    env: demo
spec:
  replicas: 1
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 25%
  selector:
    matchLabels:
      role: frontend
  template:
    metadata:
      labels:
        role: frontend
    spec:
      containers:
      - name: frontend
        image:  public.ecr.aws/f5n5l7s0/techdome-application-frontend:latest
        imagePullPolicy: Always
        env:
          - name: REACT_APP_BACKEND_URL
            value: "http://ad770966369db4de6a73d588085540ba-70910093.us-west-2.elb.amazonaws.com:8080/api/"
            # Replace the above URL with your backend LoadBalancer URL and path
        ports:
        - containerPort: 3000
```
Frontend service file (`vim frontend-service.yaml`)
```
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: workshop
spec:
  ports:
  - port: 3000
    protocol: TCP
    targetPort: 3000
  type: LoadBalancer  # Updated to LoadBalancer
  selector:
    role: frontend
```
---
### 9.4 Network Policy Configuration
Create a network policy for communicating between the frontend and the backend (`vim network-policy.yaml`).
```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: workshop
spec:
  podSelector:
    matchLabels:
      role: frontend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: techdemo-backend
```
The following files have been created:
* The `kubectl apply -f .` command is used to apply Kubernetes resource configurations defined in YAML files within the current directory.
```
kubectl apply -f .
```
* The `kubectl get pods -n workshop` command is used to list all the pods in the Kubernetes namespace named "workshop." This command provides information about the current state of the pods running in that namespace.
```
kubectl get pods -n workshop
```

* The `kubectl get svc -n workshop` command is used to list all the services in the Kubernetes namespace named "workshop." This command provides information about the services and their configurations in that namespace
```
kubectl get svc -n workshop
```

* Now you can access your application from the internet using the external IP address. You can check `http://a20575be5f4734cd5aee455069c6c700-1244691777.us-west-2.elb.amazonaws.com:3000` and `http://ad770966369db4de6a73d588085540ba-70910093.us-west-2.elb.amazonaws.com:8080` in your browser. Openand try

 _The deployment of your application has been completed._
---

## 10. Issues and Resolutions
Document any issues encountered during the deployment setup and their resolutions.

---
## Issue 10.1: Liveness Probe Fails - Container Restarting

### Issue Description:

The liveness probe configured for the /ok endpoint is failing, leading to continuous container restarts. The logs show errors related to the liveness probe.

### Resolution:

#### 1. Endpoint Configuration:

* Issue: The /ok endpoint in the server code is not correctly configured to handle the liveness probe.

* Resolution: Ensure that the /ok endpoint in server.js is configured properly and returns the expected response.

#### 2. Logs Inspection:

* Issue: Check the logs using kubectl logs <pod-name> to identify any errors or issues in handling the liveness probe.

* Resolution: Address the specific errors reported in the logs. It could be related to the server code not properly handling the liveness probe requests.
---
## Issue 10.2: Server Not Accessible After Update

### Issue Description:

After making changes to the server.js file, the server is no longer accessible, and requests to the /ok endpoint result in errors.

### Resolution:

#### 1. Syntax Errors:

* Issue: Check for any syntax errors in the modified server.js file.

* Resolution: Carefully review the changes made to server.js and fix any syntax errors. Ensure that all code blocks are closed properly.

#### 2. Server Restart:

* Issue: The server needs to be restarted for changes to take effect.

* Resolution: After fixing syntax errors, restart the server to apply the changes. This can be done by stopping the current server process and running it again.

These resolutions address common issues related to server configuration and deployment. Always check logs for detailed information about specific errors and take appropriate actions based on the feedback provided.

---
## Issue 10.3: Unable to Connect to MongoDB Atlas

### Issue Description:

The Node.js application is encountering difficulties in establishing a connection with MongoDB Atlas. This issue prevents the application from interacting with the database.

### Resolution:

#### 1. MongoDB URI Verification:

* Issue: Ensure that the MongoDB URI specified in the Node.js application configuration is correct.

* Resolution: Verify the URI, including any authentication parameters, and make corrections if necessary. This ensures that the application is attempting to connect to the correct MongoDB Atlas cluster.

#### 2. Credentials Check:

* Issue: Confirm the correctness of the MongoDB Atlas credentials (username and password) provided in the Node.js application configuration.

* Resolution: Double-check the credentials against the ones set in MongoDB Atlas. If there are discrepancies, update the application's configuration with the accurate credentials.

#### 3. Network Configuration:

* Issue: Review the network configuration of the Node.js application to ensure it allows outbound connections to MongoDB Atlas.

* Resolution: Confirm that the network configurations (firewall rules, security groups, etc.) permit outgoing connections from the application to the MongoDB Atlas cluster.

#### 4. MongoDB Atlas IP Whitelist:

* Issue: Check if the MongoDB Atlas IP whitelist includes the IPs of the Kubernetes cluster where the Node.js application is deployed.

* Resolution: Update the MongoDB Atlas IP whitelist to include the IP addresses of the Kubernetes cluster nodes. This allows incoming connections from the Kubernetes cluster to MongoDB Atlas.

---
