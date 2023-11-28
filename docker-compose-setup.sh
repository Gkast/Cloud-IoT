#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MOSQUITTO_CONFIG_DIR="$SCRIPT_DIR/mosquitto/config"
MQTT_USER="test"
MQTT_PASSWORD="test"
NODE_HOST="0.0.0.0"
NODE_PORT="3000"
PGADMIN_PASSWORD="test"
POSTGRES_USER="test"
POSTGRES_PASSWORD="test"
POSTGRES_DB="test"

declare -A VALIDATIONS=(
    ["MQTT_USER"]="^[a-zA-Z0-9_]{3,16}$"
    ["MQTT_PASSWORD"]="^[a-zA-Z0-9_]{3,16}$"
    ["NODE_HOST"]="^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    ["NODE_PORT"]="^([1-9]|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$"
    ["PGADMIN_EMAIL"]="^[^\s@]+@[^\s@]+\.[^\s@]+$"
    ["PGADMIN_PASSWORD"]="^[a-zA-Z0-9_]{3,16}$"
    ["POSTGRES_USER"]="^[a-zA-Z0-9_]{3,16}$"
    ["POSTGRES_PASSWORD"]="^[a-zA-Z0-9_]{3,16}$"
    ["POSTGRES_DB"]="^[a-zA-Z0-9_]{3,16}$"
)

log_info() {
    local info_message=$1
    echo "$(date): Info: $info_message"
}

handle_error() {
    echo "Error: $1" >&2
    exit 1
}

create_directories() {
    log_info "Creating Necessary Directories..."
    mkdir -p "$SCRIPT_DIR/haproxy" \
             "$SCRIPT_DIR/mosquitto/data" "$SCRIPT_DIR/mosquitto/data" \
             "$SCRIPT_DIR/nginx/log" \
             "$SCRIPT_DIR/pgadmin/data" \
             "$SCRIPT_DIR/postgres/data" "$SCRIPT_DIR/postgres/init" "$SCRIPT_DIR/postgres/log" || \
    handle_error "Failed to create directories"
}

create_mosquitto_files() {
    cd "$MOSQUITTO_CONFIG_DIR" || handle_error "Cannot change directory to Mosquitto config"
    log_info "Creating Mosquitto Password File..."
    echo "$MQTT_USER:$MQTT_PASSWORD" > passwd_file || handle_error "Failed to create passwd_file"
    log_info "Encrypting Mosquitto Password File..."
    mosquitto_passwd -U passwd_file || handle_error "Failed to encrypt passwords"
}

create_secrets() {
    cd "$SCRIPT_DIR" || handle_error "Cannot change directory to secrets"
    log_info "Creating Secret Files..."
    cd api
    cat << EOF > api.env
NODE_ENV="production"
NODE_HOST=$NODE_HOST
NODE_PORT=$NODE_PORT
PG_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB"
MQTT_URL="mqtt://$MQTT_USER:$MQTT_PASSWORD@mosquitto:1883"
EOF
    cd ../haproxy
    cat << EOF > haproxy.env
$NODE_HOST
API_PORT=$NODE_PORT
EOF
    cd ../pgadmin
    cat << EOF > pgadmin.env
PGADMIN_DEFAULT_EMAIL=$PGADMIN_EMAIL
PGADMIN_DEFAULT_PASSWORD=$PGADMIN_PASSWORD
EOF
    cd ../postgres
    cat << EOF > postgres.env
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_USER=$POSTGRES_USER
POSTGRES_DB=$POSTGRES_DB
EOF
}

read_variable_with_retry() {
    local var_name=$1
    local regex=$2
    local retries=2
    while (( retries > 0 )); do
        read -r -p "Enter $var_name: " new_val

        if [[ $var_name == "NODE_HOST" && ! $new_val =~ $regex ]]; then
          log_info "Invalid input for $var_name. Please try again with a valid ip."
          (( retries-- ))
        elif [[ $var_name == "NODE_PORT" && ! $new_val =~ $regex ]]; then
          log_info "Invalid input for $var_name. Please try again with a valid port."
          (( retries-- ))
        elif [[ $var_name == "PGADMIN_EMAIL" && ! $new_val =~ $regex ]]; then
          log_info "Invalid input for $var_name. Please try again with a valid email."
          (( retries-- ))
        elif [[ ! $new_val =~ $regex ]]; then
          log_info "Invalid input for $var_name. Please try again."
          (( retries-- ))
        elif [[ -n $new_val ]]; then
          eval "$var_name=\$new_val"
          break
        else
            log_info "Value cannot be empty. Please try again."
            (( retries-- ))
            if (( retries == 0 )); then
                log_info "Maximum retries reached for $var_name. Exiting."
                exit 1
            else
                log_info "Retries left for $var_name: $retries"
          fi
        fi
    done
}

perform_default_setup() {
    log_info "Performing default setup..."
    create_directories
    create_mosquitto_files
    create_secrets
}

perform_personalized_setup() {
    log_info "Performing personalized setup..."
    for var_name in "${!VALIDATIONS[@]}"; do
      read_variable_with_retry "$var_name" "${VALIDATIONS[$var_name]}"
    done
    create_directories
    create_mosquitto_files
    create_secrets
}

ask_setup_preference() {
    read -r -p "Do you want a default setup? [Y/n]: " choice
    case "$choice" in
        [Nn]) perform_personalized_setup ;;
        *) perform_default_setup ;;
    esac
}

main() {
    ask_setup_preference
    log_info "Docker Compose Initial Setup Completed!"
}

main