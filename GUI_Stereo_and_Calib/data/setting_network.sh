sudo sysctl -w net.core.netdev_max_backlog=2000
sudo sysctl -w net.core.rmem_max=26214400
sudo ip link set enp7s0 mtu 9000
sudo ip link set enp6s0 mtu 9000
sudo ip link set enp5s0 mtu 9000

