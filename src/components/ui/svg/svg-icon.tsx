import * as React from "react";
import { SvgIcons } from "@/components/ui/svg/svg-icon-resources.tsx";

interface SvgIconProps {
  title: string;
  content?: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  pagename?: string;
}

function processReactElement(
  element: React.ReactElement,
  color: string
): React.ReactElement {
  let props = { ...element.props };

  if (typeof props.style === "string") {
    const styleObj: React.CSSProperties = {};
    const stylePairs = props.style.split(";").filter((s: string) => s.trim());

    stylePairs.forEach((pair: string) => {
      const [property, value] = pair.split(":").map((s: string) => s.trim());
      if (property && value) {
        const processedValue = value.replace("var(--fill)", color);
        styleObj[property as keyof React.CSSProperties] = processedValue as any;
      }
    });

    props.style = styleObj;
  }

  if (props.children) {
    props.children = React.Children.map(props.children, (child) => {
      if (React.isValidElement(child)) {
        return processReactElement(child, color);
      }
      return child;
    });
  }

  return React.cloneElement(element, props);
}

function SvgIcon({
  title,
  content,
  size = 24,
  color = "currentColor",
  className = "",
  style = {},
  pagename,
}: SvgIconProps) {
  if (content) {
    return (
      <div dangerouslySetInnerHTML={{ __html: content }} />
    )
  }
  const icon = findSvgIcon(title, pagename);

  if (!icon) {
    console.warn(`SVG with title "${title}" not found in SvgIcons.`);
    return null;
  }

  if (!React.isValidElement(icon)) {
    return icon;
  }

  const svgStyle: React.CSSProperties = {
    width: typeof size === "number" ? `${size}px` : size,
    height: typeof size === "number" ? `${size}px` : size,
    "--fill": color,
    color: color,
    ...style,
  } as React.CSSProperties;

  const processedIcon = processReactElement(icon as React.ReactElement, color);

  return React.cloneElement(processedIcon, {
    className: `${processedIcon.props.className || ""} ${className}`.trim(),
    style: {
      ...processedIcon.props.style,
      ...svgStyle,
    },
    width: typeof size === "number" ? `${size}px` : size,
    height: typeof size === "number" ? `${size}px` : size,
  });
}

function findSvgIcon(nodeId: string, pageName?: string) {
  if (!pageName) {
    return SvgIcons[nodeId as keyof typeof SvgIcons];
  }
  const key1 = `${pageName}-${nodeId}`;
  const icon1 = SvgIcons[key1 as keyof typeof SvgIcons];
  if (icon1) {
    return icon1;
  }
  const key2 = `${nodeId}`;
  const icon2 = SvgIcons[key2 as keyof typeof SvgIcons];
  if (icon2) {
    return icon2;
  }
  return null;
}

export { SvgIcon };
export type { SvgIconProps };
