import parse, {
  domToReact,
  type DOMNode,
  type Element,
  type HTMLReactParserOptions,
} from "html-react-parser";

function isElement(node: DOMNode): node is Element {
  return node.type === "tag";
}

const options: HTMLReactParserOptions = {
  replace(domNode) {
    if (!isElement(domNode) || domNode.name !== "div") return;
    if (domNode.parent) return;

    const children = domToReact(domNode.children as DOMNode[], options);
    const className = domNode.attribs.class;
    const containsBlock = domNode.children.some((child) => {
      const node = child as DOMNode;
      return isElement(node) && node.name === "div";
    });

    if (className === "title") {
      return <h2 className="title">{children}</h2>;
    }
    if (className === "sub-title") {
      return <h3 className="sub-title">{children}</h3>;
    }
    if (containsBlock) {
      return <div>{children}</div>;
    }
    return <p className={className}>{children}</p>;
  },
};

export function RichText({ html }: { html: string }) {
  return <>{parse(html, options)}</>;
}
