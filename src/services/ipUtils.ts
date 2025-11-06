// IP地址验证
export const isValidIP = (ip: string): boolean => {
    const regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!regex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
    });
};

// 子网掩码验证
export const isValidSubnetMask = (mask: string): boolean => {
    if (!isValidIP(mask)) return false;
    
    const parts = mask.split('.').map(Number);
    const binary = parts.map(part => part.toString(2).padStart(8, '0')).join('');
    
    // 检查是否是连续的1后面跟着连续的0
    const match = binary.match(/^1+0*$/);
    return match !== null;
};

// CIDR转子网掩码
export const getMaskFromCIDR = (cidr: number): string => {
    if (cidr < 0 || cidr > 32) return '0.0.0.0';
    
    const mask = (0xffffffff << (32 - cidr)) >>> 0;
    return [
        (mask >>> 24) & 0xff,
        (mask >>> 16) & 0xff,
        (mask >>> 8) & 0xff,
        mask & 0xff
    ].join('.');
};

// 子网掩码转CIDR
export const getCIDRFromMask = (mask: string): number => {
    if (!isValidSubnetMask(mask)) return -1;
    
    const parts = mask.split('.').map(Number);
    const binary = parts.map(part => part.toString(2).padStart(8, '0')).join('');
    return binary.split('1').length - 1;
};

// IP地址转数字
export const ipToNumber = (ip: string): number => {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// 数字转IP地址
export const numberToIP = (num: number): string => {
    return [
        (num >>> 24) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 8) & 0xff,
        num & 0xff
    ].join('.');
};

// 计算网络信息
export const calculateNetworkInfo = (ip: string, mask: string) => {
    const ipNum = ipToNumber(ip);
    const maskNum = ipToNumber(mask);
    const networkNum = ipNum & maskNum;
    const broadcastNum = networkNum | (~maskNum >>> 0);
    const cidr = getCIDRFromMask(mask);
    
    const network = numberToIP(networkNum);
    const broadcast = numberToIP(broadcastNum);
    const firstHost = numberToIP(networkNum + 1);
    const lastHost = numberToIP(broadcastNum - 1);
    const usableHosts = broadcastNum - networkNum - 1;
    
    return {
        network,
        broadcast,
        firstHost,
        lastHost,
        cidr,
        usableHosts: usableHosts > 0 ? usableHosts : 0
    };
};

// 根据主机数量计算子网掩码
export const getMaskFromHostCount = (hostCount: number): string => {
    if (hostCount < 2) return '255.255.255.254';
    if (hostCount > 16777214) return '0.0.0.0';
    
    // 计算需要的位数
    let bits = Math.ceil(Math.log2(hostCount + 2)); // +2 for network and broadcast
    if (bits > 30) bits = 30;
    
    const cidr = 32 - bits;
    return getMaskFromCIDR(cidr);
};