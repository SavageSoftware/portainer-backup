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
#  a Docker container image for the local build platform/environment.
#
# *********************************************************************
#       COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
# *********************************************************************

# GET VERSION FROM PACKAGE.JSON
VERSION=$(node -p -e "require('./app/package.json').version")

# ------------------------------------------------
# BUILD DOCKER CONTAINER
# ------------------------------------------------

# perform docker image build on local system
# (https://hub.docker.com/repository/docker/savagesoftware/portainer-backup)
docker build \
  --build-arg BUILDDATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --build-arg VERSION="$VERSION"     \
  --tag savagesoftware/portainer-backup:$VERSION \
  --tag savagesoftware/portainer-backup:latest   \
  . $@
