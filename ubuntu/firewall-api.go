package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
)

const (
	PORT           = 3000
	BufferSize     = 1024
	IPTablesBan    = "ban ip"
	IPTablesUnban  = "unban ip"
	IPTablesDrop   = "iptables -A INPUT -s %s -j DROP"
	IPTablesUnDrop = "iptables -D INPUT -s %s -j DROP"
)

var serverRunning = true

func handleSigInt() {
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT)
	go func() {
		<-sigChan
		fmt.Println("\nReceived SIGINT. Cleaning up...")
		serverRunning = false
		os.Exit(0)
	}()
}

func handleClient(conn net.Conn) {
	defer func(conn net.Conn) {
		err := conn.Close()
		if err != nil {

		}
	}(conn)

	clientAddr := conn.RemoteAddr().String()
	fmt.Printf("%s Connected\n", clientAddr)

	buffer := make([]byte, BufferSize)
	asciiArt := "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣷⠀⠀⠀⢸⢣⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⡄⢠⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⣤⡌\n⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⡇⠀⠀⠀⢸⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇\n⠀⠀⠀⠀⠀⠀⠀⣰⣿⡿⣿⡇⠀⠀⠀⢸⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇\n⠀⠀⠀⠀⠀⢀⣾⣿⡟⠁⣿⣧⣀⠀⠐⠼⠸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡧⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠇\n⣦⣄⡀⠀⣠⣿⣿⣿⡁⠀⢻⣿⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⡆⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⣶⠀⣶⣶⣶⣶⣶⣶⣶⠀\n⢻⣿⣿⣿⣿⣿⣿⡇⢋⢆⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⣿⣿⣯⠻⣿⣿⡇⠘⠈⢂⠈⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⣿⣿⣿⠀⠈⢿⡇⠀⡆⠀⢆⠀⢻⣿⣿⣿⠿⢿⠿⠿⠿⠿⠿⠇⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠀⠿⠿⠿⠿⠿⠿⠿⠀\n⠀⣿⣿⡟⠀⠀⠀⠃⠀⠃⢀⠈⢆⠀⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡆⢸⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣶⣶⣶⣶⣿⠀\n⠀⣿⣿⠃⠀⠀⠀⠀⡜⡰⠙⠀⠈⡄⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⣿⣿⠀⠀⠀⠀⡜⡐⠀⢀⠀⠀⠰⠀⣿⣿⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⢸⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⣿⣿⠀⠀⠀⡜⠰⠁⠀⠀⠣⡀⠀⠇⠈⠀⢀⣿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠇⠺⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠀\n⠀⠸⣿⡆⠀⢠⢁⠃⠀⠀⠀⠀⠑⡀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠐⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⠀⠹⣷⡀⢸⢸⠀⠀⠀⠀⠀⠀⠁⡀⠀⠀⣼⣿⣿⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⠀⠀⠘⢷⡀⢎⡄⠀⠀⠀⠀⠀⣦⠁⢀⣼⣿⣿⣿⣿⣿⣿⣿⡇⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠀⣿⣿⣿⣿⣿⣿⣿⠀\n⠀⠀⠀⠀⠀⢽⣾⣞⣄⣀⣀⣠⣞⣥⣚⣛⣛⣛⣛⣛⣛⣛⣛⣛⣃⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣛⣈⣛⣛⣛⣛⣛⣛⣛⣠\n"
	_, err := conn.Write([]byte(asciiArt + "\n\nWelcome to the server!\n"))
	if err != nil {
		fmt.Println("Error sending welcome message:", err)
		return
	}

	n, err := conn.Read(buffer)
	if err != nil {
		fmt.Println("Error reading:", err)
		return
	}

	command := strings.TrimSpace(string(buffer[:n]))
	switch {
	case strings.HasPrefix(command, IPTablesBan) && len(command) > len(IPTablesBan):
		ipToBan := strings.TrimSpace(command[len(IPTablesBan):])
		fmt.Println("IP to Ban:", ipToBan)
		banCommand := fmt.Sprintf(IPTablesDrop, ipToBan)
		if err := runCommand(banCommand); err != nil {
			sendResponse(conn, fmt.Sprintf("Error banning IP %s\n", ipToBan))
			return
		}
		sendResponse(conn, fmt.Sprintf("IP %s has been banned\n", ipToBan))

	case strings.HasPrefix(command, IPTablesUnban) && len(command) > len(IPTablesUnban):
		ipToUnban := strings.TrimSpace(command[len(IPTablesUnban):])
		fmt.Println("IP to Unban:", ipToUnban)
		unbanCommand := fmt.Sprintf(IPTablesUnDrop, ipToUnban)
		if err := runCommand(unbanCommand); err != nil {
			sendResponse(conn, fmt.Sprintf("Error unbanning IP %s\n", ipToUnban))
			return
		}
		sendResponse(conn, fmt.Sprintf("IP %s has been unbanned\n", ipToUnban))

	default:
		sendResponse(conn, "Bad Command\n")
	}

	fmt.Printf("%s Disconnected\n", clientAddr)
}

func sendResponse(conn net.Conn, message string) {
	_, err := conn.Write([]byte(message))
	if err != nil {
		fmt.Println("Error sending response:", err)
	}
}

func runCommand(command string) error {
	cmd := exec.Command("/bin/sh", "-c", command)
	err := cmd.Run()
	return err
}

func main() {
	handleSigInt()

	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", PORT))
	if err != nil {
		fmt.Println("Error starting server:", err)
		return
	}
	defer func(listener net.Listener) {
		err := listener.Close()
		if err != nil {

		}
	}(listener)

	fmt.Printf("Server running on port %d\n", PORT)

	for serverRunning {
		conn, err := listener.Accept()
		if err != nil {
			fmt.Println("Error accepting connection:", err)
			continue
		}
		go handleClient(conn)
	}

	fmt.Println("Server shutting down gracefully.")
}
