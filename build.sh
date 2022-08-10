#!/bin/sh -e
# *********************************************************************
#    ___   ___   ___   ___ ___                
#   / __| /_\ \ / /_\ / __| __|               
#   \__ \/ _ \ V / _ \ (_ | _|                
#   |___/_/_\_\_/_/_\_\___|___| ___   ___ ___ 
#   / __|/ _ \| __|_   _\ \    / /_\ | _ \ __|
#   \__ \ (_) | _|  | |  \ \/\/ / _ \|   / _| 
#   |___/\___/|_|   |_|   \_/\_/_/ \_\_|_\___|
# 
#  -------------------------------------------------------------------
#                         PORTAINER-BACKUP
#          https://github.com/SavageSoftware/portainer-backup
#  -------------------------------------------------------------------
#
#  This script compiles and builds the current project sources into
#  a Docker container image for ARM64 and x86_64 platforms.
#
#  Use the "--push" argument with this script to push the completed
#  docker images to the DockerHub container registry.
#
# *********************************************************************
#       COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
# *********************************************************************

# GET VERSION FROM PACKAGE.JSON
VERSION=$(node -p -e "require('./package.json').version")

# use buildx to create a new builder instance; if needed
docker buildx create --driver-opt env.BUILDKIT_STEP_LOG_MAX_SIZE=10485760   \
                     --driver-opt env.BUILDKIT_STEP_LOG_MAX_SPEED=100000000 \
                     --use --name portainer-backup-builder || true;

# perform multi-arch platform image builds; push the resulting image to the DockerHub container registry
# (https://hub.docker.com/repository/docker/savagesoftware/portainer-backup)
docker buildx build \
  --build-arg BUILDDATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --build-arg VERSION="$VERSION"     \
  --platform linux/amd64,linux/arm64,linux/arm \
  --tag savagesoftware/portainer-backup:$VERSION \
  --tag savagesoftware/portainer-backup:latest   \
  . $@

# if unable to build, you may need to remove builder
# to allow script to re-create it using the following command:
# docker buildx rm portainer-backup-builder