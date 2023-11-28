#!/bin/bash

# Clear existing rules
iptables -F
iptables -Z
iptables -X

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback and established/related connections
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

sysctl -w net.ipv4.ip_forward=1

declare -A PORTS=(
    [1883]=172.16.10.4:1883
    [8081]=172.16.10.5:80
    [8082]=172.16.10.6:80
)


sysctl -w net.ipv4.ip_forward=1

# Function to add port forwarding and forwarding rules
add_port_forwarding() {
    local external_port="$1"
    local internal_destination="$2"

    # Allow forwarding of the redirected packets
    iptables -A FORWARD -i eth0 -p tcp --dport "$external_port" -d "${internal_destination%:*}" -j ACCEPT

    # Redirect incoming packets to internal IPs and ports
    iptables -t nat -A PREROUTING -i eth0 -p tcp --dport "$external_port" -j DNAT --to-destination "$internal_destination"
}

# Allow established and related connections
iptables -A FORWARD -i eth0 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Loop through defined ports for port forwarding
for external_port in "${!PORTS[@]}"; do
    internal_destination="${PORTS[$external_port]}"
    echo "Port forward: $internal_destination $external_port"
    add_port_forwarding "$external_port" "$internal_destination"
done

# Set up masquerading for outgoing connections, excluding marked packets
iptables -t nat -A POSTROUTING -j MASQUERADE

# Drop invalid/malformed packets and prevent certain TCP flag combinations
iptables -A INPUT -m conntrack --ctstate INVALID -j LOG --log-prefix "INVALID: "
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

iptables -A INPUT -p tcp --tcp-flags ALL NONE -j LOG --log-prefix "TCP FLAGS ALL NONE: "
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP

iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j LOG --log-prefix "TCP FLAGS SYN,FIN: "
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP

iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j LOG --log-prefix "TCP FLAGS SYN,RST: "
iptables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP

# Prevent ICMP flood and log excessive requests
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j LOG --log-prefix "ICMP: "
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT
iptables -A INPUT -p icmp -m conntrack --ctstate NEW -j LOG --log-prefix "ICMP: "
iptables -A INPUT -p icmp -m conntrack --ctstate NEW -j DROP

# Log forwarded packets before allowing/dropping
iptables -A FORWARD -j LOG --log-prefix "FORWARDED: "
iptables -A FORWARD -j ACCEPT

iptables -A FORWARD -j LOG --log-prefix "FORWARD-DENIED: "
iptables -A FORWARD -j DROP

# Log established and related connections
iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j LOG --log-prefix "RELATED/ESTABLISHED: "
iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Log dropped packets with specific TCP flag combinations
iptables -A INPUT -p icmp -j LOG --log-prefix "DROPPED ICMP: "
iptables -A INPUT -p icmp -j DROP

# Set a limit of 5 concurrent connections for SSH (port 22)
#iptables -A INPUT -p tcp --syn --dport 22 -m connlimit --connlimit-above 5 --connlimit-mask 0 -j DROP
iptables -I INPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT

# Rate limit incoming traffic on ports 80 (HTTP) and 443 (HTTPS)
rate_limit_ports() {
    local port="$1"
    iptables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -m limit --limit 1000/second --limit-burst 100 -j LOG --log-prefix "Port $port limit exceeded: "
    iptables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j DROP
}

iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Apply rate limits to ports 80 and 443
rate_limit_ports 80
rate_limit_ports 443

# Display configured rules
iptables -L -v --line-numbers
