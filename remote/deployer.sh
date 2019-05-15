#!/bin/bash

################################################################################
# Targoman Web User Inferface
#
# Copyright (c) 2019 by Targoman Co. Pjc. <http://tip.co.ir>
# All rights reserved.
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#     * Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above copyright
#       notice, this list of conditions and the following disclaimer in the
#       documentation and/or other materials provided with the distribution.
#     * Neither the name of the <organization> nor the
#       names of its contributors may be used to endorse or promote products
#       derived from this software without specific prior written permission.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
# DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
# ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#
################################################################################

COMMAND=$2
if [ "$COMMAND" == "scp -t /tmp" ]; then
    bash "$@"
    exit $?
fi
if [ "${COMMAND:0:6}" == "copyid" ]; then
    echo ${COMMAND:7} >> /home/deployer/.ssh/authorized_keys
    exit $?
fi
if [ "${COMMAND:0:6}" == "deploy" ]; then
    TAG=${COMMAND:7}
    if [ -z "$TAG" ];then
        echo "No tag provided";
        exit;
    fi
    if [ ! -f "/tmp/$TAG.tgz" ];then
        echo "No tarball files corresponding to this tag($TAG) was found."
        exit;
    fi
    TARGET_DIR=$TAG
    if [ "$(realpath /srv/www/vhosts/targoman.ir/htdocs/Active)" == "/TIP/targomanWUI/Builds/$TAG" ]; then
        TARGET_DIR="$TAG.tmp"
    fi
    echo "Deploying $TAG..."
    cd /TIP/targomanWUI/Builds/ && \
        mkdir -p $TARGET_DIR && \
        cd $TARGET_DIR && \
        rm -rf * && \
        tar xvf /tmp/$TAG.tgz && \
        cd .. && \
        ln -snf $TARGET_DIR Test && \
        rm /tmp/$TAG.tgz && \
        echo "Ready!" && \
        exit 0
    echo "Failed!"
    exit 1
else
    echo "Limited user. Command not supported."
    exit 1
fi
