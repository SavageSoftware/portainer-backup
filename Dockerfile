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
#  This Dockerfile creates an Alpine-based Linux docker image
#  with the PORTAINER-BACKUP utility installed.  This is useful
#  for creating a Docker container to perform scheduled backups
#  of a portainer server.
#
# *********************************************************************
#       COPYRIGHT SAVAGESOFTWARE,LLC, @ 2022, ALL RIGHTS RESERVED
# *********************************************************************
FROM node:lts-alpine
RUN apk update && apk add --no-cache tzdata

# IMAGE ARGUMENTS PASSED IN FROM BUILDER
ARG TARGETARCH
ARG BUILDDATE
ARG BUILDVERSION

# PROVIDE IMAGE LABLES
LABEL "com.example.vendor"="ACME Incorporated"
LABEL vendor="Savage Software, LLC"
LABEL maintainer="Robert Savage"
LABEL description="Utility for scripting or scheduling scheduled backups for Portainer"
LABEL url="https://github.com/SavageSoftware/portainer-backup"
LABEL org.label-schema.name="savagesoftware/portainer-backup"
LABEL org.label-schema.description="Utility for scripting or scheduling scheduled backups for Portainer"
LABEL org.label-schema.url="https://github.com/SavageSoftware/portainer-backup"
LABEL org.label-schema.vcs-url="https://github.com/SavageSoftware/portainer-backup.git"
LABEL org.label-schema.vendor="Savage Software, LLC"
LABEL org.label-schema.docker.cmd="docker run -it --rm --name portainer-backup --volume $PWD/backup:/backup savagesoftware/portainer-backup:latest backup"

# DEFAULT ENV VARIABLE VALUES
ENV TZ="America/New_York" 
ENV PORTAINER_BACKUP_URL="http://portainer:9000"
ENV PORTAINER_BACKUP_TOKEN=""
ENV PORTAINER_BACKUP_DIRECTORY="/backup"
ENV PORTAINER_BACKUP_FILENAME="/portainer-backup.tar.gz"
ENV PORTAINER_BACKUP_OVERWRITE=false
ENV PORTAINER_BACKUP_CONCISE=false
ENV PORTAINER_BACKUP_DEBUG=false
ENV PORTAINER_BACKUP_DRYRUN=false
ENV PORTAINER_BACKUP_STACKS=false

# NODEJS RUNNING THIS APPLICATION IS THE ENTRYPOINT
ENTRYPOINT [ "/usr/local/bin/node", "/portainer-backup/src/index.js" ]

# DEFAULT COMMAND (if none provided)
CMD ["schedule"]

VOLUME "/backup"

# PROVIDE IMAGE VERSION UNFORMATION
LABEL version="$VERSION"
LABEL org.label-schema.schema-version="$VERSION"
LABEL org.label-schema.version=$VERSION

# INSTALL ADDITIONAL IMAGE DEPENDENCIES AND COPY APPLICATION TO IMAGE
WORKDIR /portainer-backup
COPY package.json /portainer-backup/package.json
RUN npm install --silent

COPY src/*.js /portainer-backup/src/

LABEL org.label-schema.build-date="$BUILDDATE"
