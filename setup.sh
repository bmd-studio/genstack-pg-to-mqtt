#!/bin/sh -x

if [ "$NODE_ENV" == "development" ]; then
    echo "Setting up development..."
else
    echo "Setting up production..."
    npm prune --production
fi
