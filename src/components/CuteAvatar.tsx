import { useState, useEffect, useRef } from 'react';
import './CuteAvatar.css';

// 定义组件属性接口
interface CuteAvatarProps {
    className?: string;
}

// 可爱动漫头像组件
export default function CuteAvatar({ className = '' }: CuteAvatarProps) {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [expression, setExpression] = useState('😊');
    const avatarRef = useRef<HTMLDivElement>(null);

    // 表情数组
    const expressions = ['😊', '😄', '😍', '🥰', '😎', '🤗', '😋', '🥳', '😇', '🤭', '😴', '🤔', '😮', '🥺', '😏'];

    // 鼠标移动事件处理
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // 随机更换表情
    useEffect(() => {
        const changeExpression = () => {
            const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
            setExpression(randomExpression);
        };

        // 初始表情
        changeExpression();

        // 每4-10秒随机更换表情
        const interval = setInterval(() => {
            changeExpression();
        }, Math.random() * 6000 + 4000);

        return () => clearInterval(interval);
    }, []);

    // 计算表情看向鼠标的角度和倾斜
    const calculateExpressionTransform = () => {
        if (!avatarRef.current) return { rotate: 0, translateX: 0, translateY: 0 };

        const rect = avatarRef.current.getBoundingClientRect();
        const avatarCenterX = rect.left + rect.width / 2;
        const avatarCenterY = rect.top + rect.height / 2;

        // 计算鼠标相对于头像中心的角度
        const angle = Math.atan2(mousePosition.y - avatarCenterY, mousePosition.x - avatarCenterX);
        const distance = Math.min(Math.sqrt(Math.pow(mousePosition.x - avatarCenterX, 2) + Math.pow(mousePosition.y - avatarCenterY, 2)), 150);

        // 增大倾斜角度范围（-45度到45度）
        const rotate = Math.sin(angle) * 45;

        // 增加位移效果
        const translateX = Math.cos(angle) * distance * 0.1;
        const translateY = Math.sin(angle) * distance * 0.1;

        return { rotate, translateX, translateY };
    };

    const transform = calculateExpressionTransform();

    // 合并 className
    const avatarClassName = `cute-avatar ${className}`.trim();

    return (
        <div
            ref={avatarRef}
            className={avatarClassName}
            style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'box-shadow 0.3s ease',
                boxShadow: '0 4px 15px rgba(25, 84, 123, 0.3)',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(25, 84, 123, 0.4)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(25, 84, 123, 0.3)';
            }}
        >
            {/* 表情符号 - 整体跟随鼠标 */}
            <div
                className="avatar-expression"
                style={{
                    fontSize: '22px',
                    transition: 'transform 0.1s ease-out',
                    transform: `rotate(${transform.rotate}deg) translate(${transform.translateX}px, ${transform.translateY}px)`,
                    display: 'inline-block',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }}
            >
                {expression}
            </div>
        </div>
    );
}