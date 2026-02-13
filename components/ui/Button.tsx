import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    ...props
}) => {
    const baseClass = 'btn';
    const variantClass = `btn--${variant}`;
    const sizeClass = `btn--${size}`;
    const widthClass = fullWidth ? 'btn--full' : '';

    const combinedClasses = [baseClass, variantClass, sizeClass, widthClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <button className={combinedClasses} {...props}>
            {children}
        </button>
    );
};
