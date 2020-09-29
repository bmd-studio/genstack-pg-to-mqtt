ARG DOCKER_IMAGE
FROM $DOCKER_IMAGE as build

WORKDIR /usr/src/app/
COPY ./ ./
RUN yarn --frozen-lockfile
RUN yarn build

ARG GS_ENV
RUN /bin/sh setup.sh

FROM $DOCKER_IMAGE as base

COPY --from=build /usr/src/app/ ./

COPY docker-healthcheck.js /usr/local/lib/
HEALTHCHECK --interval=5s --timeout=10s --retries=3 CMD node /usr/local/lib/docker-healthcheck.js

USER node

# CMD tail -f /dev/null
CMD ["/bin/sh", "exec.sh"]
