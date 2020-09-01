ARG DOCKER_IMAGE
FROM $DOCKER_IMAGE

WORKDIR /usr/src/app/
COPY ./ ./
RUN /bin/bash setup.sh

COPY docker-healthcheck.js /usr/local/lib/
HEALTHCHECK --interval=5s --timeout=10s --retries=3 CMD node /usr/local/lib/docker-healthcheck.js

USER node

#CMD tail -f /dev/null
CMD ["/bin/bash", "exec.sh"]

