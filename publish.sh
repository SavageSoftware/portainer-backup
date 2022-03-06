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
#  a Docker container image for ARM64 and x86_64 platforms.  Next,
#  the script publishes the Docker images, publishes the project
#  to the NPM registry.
#
# *********************************************************************
#       COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
# *********************************************************************

# BUMP VERSION IN PACKAGE.JSON
#npm version patch

# BUILD AND PUSH DOCKER IMAGES TO: DockerHub
# https://hub.docker.com/repository/docker/savagesoftware/portainer-backup
./build.sh --push

# PUSH README.MD TO: DockerHub 
# https://hub.docker.com/repository/docker/savagesoftware/portainer-backup
docker pushrm savagesoftware/portainer-backup 

# PUBLISH TO: NPM REGISTRY 
# https://www.npmjs.com/package/portainer-backup
npm publish  
