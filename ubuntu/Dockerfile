FROM golang AS builder
WORKDIR /usr/src
COPY firewall-api.go .
RUN go build -o firewall-api firewall-api.go

FROM ubuntu:latest

RUN echo 'export PS1="\[\033[1;32m\]\u@\h\[\033[0m\] \[\033[1;34m\]\w\[\033[0m\]\n\$ "' >> /root/.bashrc

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y \
    iptables \
    openssh-server \
    iproute2 \
    net-tools \
    telnet \
    nano \
    iputils-ping \
    traceroute \
    tcpdump \
    socat \
    curl \
    haproxy \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN echo 'PermitRootLogin without-password\nPasswordAuthentication no' >> /etc/ssh/sshd_config && \
    mkdir -p /root/.ssh && \
    chmod 700 /root/.ssh

COPY --from=builder /usr/src/firewall-api /usr/src/firewall-api
COPY iptables_rules.sh /usr/src/iptables_rules.sh

COPY ssh/ubuntu_id_rsa.pub /root/.ssh/authorized_keys

RUN chmod +x /usr/src/iptables_rules.sh && \
    chmod 600 /root/.ssh/authorized_keys

COPY certs /usr/local/etc/haproxy/certs

COPY haproxy.cfg /etc/haproxy/haproxy.cfg

CMD service ssh start && service haproxy start && /usr/src/iptables_rules.sh && /usr/src/firewall-api