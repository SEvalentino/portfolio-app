pipeline {
  agent any

  environment {
    PROJECT_ID   = 'valentino-project-471103'
    REGION       = 'asia-southeast1'
    AR_REPO      = 'portfolio-repo'
    IMAGE_NAME   = 'portfolio-app'
    IMAGE_URI    = "asia-southeast1-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}"
    CLUSTER      = 'portfolio-cluster'
    ZONE         = 'asia-southeast1-a'
    K8S_NAMESPACE= 'portfolio'
    SONARQUBE_ENV= 'sonarqube'                 // harus match di Manage Jenkins → System → SonarQube servers
    USE_GKE_GCLOUD_AUTH_PLUGIN = 'True'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv("${SONARQUBE_ENV}") {
          script {
            def scannerHome = tool 'sonar-scanner'  // pastikan tool ini ada di Global Tool Configuration
            sh """
              set -euxo pipefail
              "${scannerHome}/bin/sonar-scanner"
            """
          }
        }
      }
    }

    stage('Build & Push Image') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-jenkins', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh """
            set -euxo pipefail
            gcloud auth activate-service-account --key-file="\$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

            TAG=\$(date +%Y%m%d-%H%M%S)
            docker build -t ${IMAGE_URI}:\$TAG -t ${IMAGE_URI}:latest .
            docker push ${IMAGE_URI}:\$TAG
            docker push ${IMAGE_URI}:latest
            echo "\$TAG" > .image_tag
          """
        }
      }
    }

    stage('Deploy to GKE') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-jenkins', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh """
            set -euxo pipefail
            export USE_GKE_GCLOUD_AUTH_PLUGIN=True

            gcloud auth activate-service-account --key-file="\$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud container clusters get-credentials ${CLUSTER} --zone ${ZONE} --project ${PROJECT_ID}

            kubectl get ns ${K8S_NAMESPACE} >/dev/null 2>&1 || kubectl create ns ${K8S_NAMESPACE}

            kubectl apply -n ${K8S_NAMESPACE} -f k8s/deployment.yaml
            kubectl apply -n ${K8S_NAMESPACE} -f k8s/service.yaml

            TAG=\$(cat .image_tag)
            kubectl -n ${K8S_NAMESPACE} set image deployment/portfolio-app portfolio=${IMAGE_URI}:\$TAG
            kubectl -n ${K8S_NAMESPACE} rollout status deployment/portfolio-app --timeout=180s
          """
        }
      }
    }
  }

  post {
    always {
      withCredentials([file(credentialsId: 'gcp-sa-jenkins', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
        sh """
          set +e
          export USE_GKE_GCLOUD_AUTH_PLUGIN=True
          gcloud auth activate-service-account --key-file="\$GOOGLE_APPLICATION_CREDENTIALS" >/dev/null 2>&1 || true
          gcloud container clusters get-credentials ${CLUSTER} --zone ${ZONE} --project ${PROJECT_ID} >/dev/null 2>&1 || true
          kubectl -n ${K8S_NAMESPACE} get pods || true
        """
      }
    }
  }
}
