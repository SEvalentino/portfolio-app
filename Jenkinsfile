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
    SONARQUBE_ENV= 'sonarqube'
    USE_GKE_GCLOUD_AUTH_PLUGIN = 'True'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv("${SONARQUBE_ENV}") {
          script {
            def scannerHome = tool 'sonar-scanner'
            sh """
              set -eu
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
            set -eu
            gcloud auth activate-service-account --key-file="\$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud auth configure-docker ${REGION}-docker.pkg.dev -q

            TAG=\$(date +%Y%m%d-%H%M%S)
            docker info >/dev/null
            docker build -t ${IMAGE_URI}:\$TAG -t ${IMAGE_URI}:latest .
            docker push ${IMAGE_URI}:\$TAG
            docker push ${IMAGE_URI}:latest
            echo "\$TAG" > .image_tag
          """
        }
      }
    }

    stage('Deploy to GKE (Helm)') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-jenkins', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh """
            set -eu
            export USE_GKE_GCLOUD_AUTH_PLUGIN=True
            gcloud auth activate-service-account --key-file="\$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud container clusters get-credentials ${CLUSTER} --zone ${ZONE} --project ${PROJECT_ID}

            # pastikan helm tersedia
            helm version

            TAG=\$(cat .image_tag)
            helm upgrade --install portfolio-app /portfolio-chart \
              --namespace ${K8S_NAMESPACE} \
              --create-namespace \
              --set image.repository=${IMAGE_URI} \
              --set image.tag=\$TAG \
              --set replicaCount=2

            kubectl -n ${K8S_NAMESPACE} rollout status deployment/portfolio-app --timeout=120s
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
