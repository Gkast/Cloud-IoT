#!/bin/bash

# Clear existing rules
ip6tables -F
ip6tables -Z
ip6tables -X

# Set default policies
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

# Allow loopback and established/related connections
ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A OUTPUT -o lo -j ACCEPT
ip6tables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1

# Apply port forwarding rules
declare -A PORTS=(
    [80]=fd00::3:80
    [443]=fd00::3:443
    [8080]=fd00::3:8080
    [1883]=fd00::4:1883
    [8081]=fd00::5:80
    [8082]=fd00::6:80
)

# Function to add port forwarding and forwarding rules for IPv6
add_port_forwarding_ipv6() {
    local external_port="$1"
    local internal_destination="$2"

    # Allow forwarding of the redirected packets
    ip6tables -A FORWARD -i eth0 -o eth1 -p tcp --dport "$external_port" -d "${internal_destination%:*}" -j ACCEPT

    # Redirect incoming packets to internal IPs and ports
    ip6tables -t nat -A PREROUTING -i eth0 -p tcp --dport "$external_port" -j DNAT --to-destination "$internal_destination"
}

# Loop through defined ports for port forwarding for IPv6
for external_port in "${!PORTS[@]}"; do
    internal_destination="${PORTS[$external_port]}"
    echo "IPv6 Port forward: $internal_destination $external_port"
    add_port_forwarding_ipv6 "$external_port" "$internal_destination"
done

# Set up masquerading for outgoing connections
ip6tables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

ip6tables -A FORWARD -i eth1 -o eth0 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Drop invalid/malformed packets and prevent certain TCP flag combinations for IPv6
ip6tables -A INPUT -m conntrack --ctstate INVALID -j LOG --log-prefix "INVALID: "
ip6tables -A INPUT -m conntrack --ctstate INVALID -j DROP

ip6tables -A INPUT -p tcp --tcp-flags ALL NONE -j LOG --log-prefix "TCP FLAGS ALL NONE: "
ip6tables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP

ip6tables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j LOG --log-prefix "TCP FLAGS SYN,FIN: "
ip6tables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP

ip6tables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j LOG --log-prefix "TCP FLAGS SYN,RST: "
ip6tables -A INPUT -p tcp --tcp-flags SYN,RST SYN,RST -j DROP

# Prevent ICMP flood and log excessive requests for IPv6
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type echo-request -m limit --limit 1/s -j LOG --log-prefix "ICMPv6: "
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type echo-request -m limit --limit 1/s -j ACCEPT
ip6tables -A INPUT -p ipv6-icmp -m conntrack --ctstate NEW -j LOG --log-prefix "ICMPv6: "
ip6tables -A INPUT -p ipv6-icmp -m conntrack --ctstate NEW -j DROP

# Log and drop all other traffic for IPv6
ip6tables -A INPUT -j LOG --log-prefix "DENIED: "
ip6tables -A INPUT -j DROP

# Set a limit of 5 concurrent connections for SSH (port 22) for IPv6
#ip6tables -A INPUT -p tcp --syn --dport 22 -m connlimit --connlimit-above 5 --connlimit-mask 0 -j DROP
ip6tables -I INPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT

# Rate limit incoming traffic on ports 80 (HTTP) and 443 (HTTPS) for IPv6
rate_limit_ports_ipv6() {
    local port="$1"
    ip6tables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -m limit --limit 1000/second --limit-burst 100 -j ACCEPT
    ip6tables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j LOG --log-prefix "IPv6 Port $port limit exceeded: "
    ip6tables -A INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j DROP
}

# Apply rate limits to ports 80 and 443 for IPv6
rate_limit_ports_ipv6 80
rate_limit_ports_ipv6 443

# Display configured rules for IPv6
ip6tables -L -v --line-numbers
