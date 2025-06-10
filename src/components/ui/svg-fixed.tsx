import React from 'react';
import { cn } from '@/utils/utils';

// Define the available icons
const icons = {
  heartFilled: {
    path: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
  },
  fireTest: {
    path: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  },
  girlLuna: {
    path: <path d="M2 12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H13C14.9628 4 15.9443 4 16.7889 4.42229C17.6334 4.84458 18.2223 5.62972 19.4 7.2C21.1333 9.51111 22 10.6667 22 12C22 13.3333 21.1333 14.4889 19.4 16.8C18.2223 18.3703 17.6334 19.1554 16.7889 19.5777C15.9443 20 14.9628 20 13 20H10C6.22876 20 4.34315 20 3.17157 18.8284C2 17.6569 2 15.7712 2 12Z
    m10.5 9.375c-0.8284 0-1.5 0.5876-1.5 1.3125s0.6716 1.3125 1.5 1.3125 1.5 0.5876 1.5 1.3125-0.6716 1.3125-1.5 1.3125m0-5.25c0.6531 0 1.2087 0.3652 1.4146 0.875m-1.4146-0.875v-0.875m0 6.125c-0.6531 0-1.2087-0.3652-1.4146-0.875m1.4146 0.875v0.875" 
   
    />
 ,
},
};

export type IconName = keyof typeof icons;

interface SVGfixedProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: string | number;
  width?: string | number;
  height?: string | number;
  strokeClassName?: string;
  fillClassName?: string;
}

export const SVGfixed: React.FC<SVGfixedProps> = ({
  name,
  size,
  width,
  height,
  strokeClassName = 'text-current',
  fillClassName = 'fill-none',
  className,
  ...props
}) => {
  const icon = icons[name];
  if (!icon) return null;

  // Size overrides width and height if provided
  const finalWidth = size || width || '24';
  const finalHeight = size || height || '24';

  // Add 'px' if the value is a number or string number
  const addPx = (value: string | number) => {
    if (typeof value === 'number' || !isNaN(Number(value))) {
      return `${value}px`;
    }
    return value;
  };

  // Extract color from Tailwind class for stroke
  const strokeColorClass = strokeClassName?.startsWith('text-') ? strokeClassName : 'text-current';
  
  // Extract color from Tailwind class for fill
  const fillColorClass = fillClassName?.startsWith('bg-') 
    ? fillClassName.replace('bg-', 'fill-')
    : fillClassName;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={addPx(finalWidth)}
      height={addPx(finalHeight)}
      className={cn(strokeColorClass, fillColorClass, className)}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {icon.path}
    </svg>
  );
};

export default SVGfixed; 