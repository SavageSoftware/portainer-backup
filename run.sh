#!/bin/bash
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
#  This script executes a backup of portainer data using the 
#  'portainer-backup' Docker container image.
#
# *********************************************************************
#       COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
# *********************************************************************
docker run -it --rm \
  --name portainer-backup \
  --volume $PWD/backup:/backup \
  --env TZ="America/New_York" \
  --env PORTAINER_BACKUP_URL="http://portainer:9000" \
  --env PORTAINER_BACKUP_TOKEN="YOUR_PORTAINER_ACCESS_TOKEN_GOES_HERE" \
  --env PORTAINER_BACKUP_PASSWORD=""  \
  --env PORTAINER_BACKUP_OVERWRITE=true  \
  --env PORTAINER_BACKUP_SCHEDULE="0 0 0 * * *" \
    savagesoftware/portainer-backup:latest $@

# ------------------------
# OPTIONAL ENV VARIABLES
# ------------------------
#  --env PORTAINER_BACKUP_STACKS=true
#  --env PORTAINER_BACKUP_DRYRUN=true
#  --env PORTAINER_BACKUP_CONCISE=true
#  --env PORTAINER_BACKUP_DIRECTORY=/backup
#  --env PORTAINER_BACKUP_FILENAME=portainer-backup.tar.gz
#  --env FORCE_COLOR=0

