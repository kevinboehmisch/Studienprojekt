// src/utils/outlineUtils.ts
export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  children?: OutlineItem[];
}

export interface NumberedOutlineItem extends OutlineItem {
  numberedTitle: string;
  children?: NumberedOutlineItem[];
}

export const parseGeneratedOutlineText = (text: string): OutlineItem[] => {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const newOutline: OutlineItem[] = [];
  const parentStack: OutlineItem[] = []; // Stack zur Verfolgung von Eltern-Elementen

  lines.forEach(line => {
    const trimmedLine = line.trim();
    const match = trimmedLine.match(/^([\d\.]+)\s+(.*)/); // Trennt Nummer und Titel

    if (match) {
      const numberPart = match[1];
      const titleText = match[2].trim(); // Reiner Titel
      const currentLevel = numberPart.split('.').filter(Boolean).length;

      if (currentLevel <= 0) {
        console.warn("parseGeneratedOutlineText: Skipping line with invalid level:", trimmedLine);
        return;
      }

      const newItem: OutlineItem = {
        id: `outline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: titleText,
        level: currentLevel,
        children: [],
      };

      // Stack-Logik zur korrekten Hierarchiebildung
      while (parentStack.length >= currentLevel) {
        parentStack.pop();
      }

      if (currentLevel === 1) {
        newOutline.push(newItem);
        // Stelle sicher, dass der Stack für ein neues L1-Element korrekt zurückgesetzt wird, falls nötig
        if (parentStack.length > 0 && parentStack[0].level !== 0) parentStack.pop(); // clear stack
        parentStack.push(newItem);
      } else {
        const parent = parentStack[currentLevel - 2]; // Das Elternelement sollte auf stack[level-2] sein
        if (parent && parent.level === currentLevel - 1) {
          parent.children = parent.children || [];
          parent.children.push(newItem);
          // Stelle sicher, dass das newItem auf der korrekten Ebene im Stack platziert wird
          if (parentStack.length < currentLevel) {
            parentStack.push(newItem);
          } else {
            parentStack[currentLevel - 1] = newItem;
          }
        } else {
          console.warn(
            `parseGeneratedOutlineText: Orphaned item "${titleText}" (L${currentLevel}). Attempting to attach to last known parent or root. Current stack:`,
            JSON.parse(JSON.stringify(parentStack))
          );
          // Fallback: An das letzte bekannte Element anhängen oder als L1 behandeln
          if (parentStack.length > 0) {
            const fallbackParent = parentStack[parentStack.length - 1];
            fallbackParent.children = fallbackParent.children || [];
            newItem.level = fallbackParent.level + 1; // Level anpassen
            fallbackParent.children.push(newItem);
            if (parentStack.length < newItem.level) parentStack.push(newItem);
            else parentStack[newItem.level -1 ] = newItem;

          } else {
            newItem.level = 1;
            newOutline.push(newItem);
            parentStack.push(newItem);
          }
        }
      }
    } else {
      console.warn("parseGeneratedOutlineText: Skipping malformed line:", trimmedLine);
    }
  });
  console.log("parseGeneratedOutlineText: Final parsed structure:", JSON.stringify(newOutline, null, 2));
  return newOutline;
};

export const addOutlineItemRecursively = (
  items: OutlineItem[],
  parentId?: string
): OutlineItem[] => {
  const newId = `outline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  if (!parentId) { // Neues Hauptkapitel
    const newItem: OutlineItem = {
      id: newId,
      title: "Neues Hauptkapitel", // Reiner Titel
      level: 1, // Hauptkapitel haben Level 1
      children: []
    };
    return [...items, newItem];
  }

  return items.map(item => {
    if (item.id === parentId) {
      const newItem: OutlineItem = {
        id: newId,
        title: "Neues Unterkapitel", // Reiner Titel
        level: item.level + 1, // Level ist Parent-Level + 1
        children: []
      };
      return {
        ...item,
        children: [...(item.children || []), newItem]
      };
    }
    if (item.children) {
      return { ...item, children: addOutlineItemRecursively(item.children, parentId) };
    }
    return item;
  });
};

export const updateOutlineItemTitleRecursively = (
  items: OutlineItem[],
  itemId: string,
  newTitle: string
): OutlineItem[] => {
  return items.map(item => {
    if (item.id === itemId) {
      return { ...item, title: newTitle }; // newTitle ist der reine Titel
    }
    if (item.children) {
      return { ...item, children: updateOutlineItemTitleRecursively(item.children, itemId, newTitle) };
    }
    return item;
  });
};

export const deleteOutlineItemRecursively = (
  items: OutlineItem[],
  itemId: string
): OutlineItem[] => {
  return items.filter(item => {
    if (item.id === itemId) return false; // Element entfernen
    if (item.children) {
      item.children = deleteOutlineItemRecursively(item.children, itemId);
    }
    return true;
  });
};

export function generateNumberedDisplayOutline(
  outlineItems: OutlineItem[],
  parentNumbering = ""
): NumberedOutlineItem[] {
  return outlineItems.map((item, index) => {
    const currentNumber = `${parentNumbering}${index + 1}`;
    const numberedTitle = `${currentNumber}. ${item.title}`;
    const newItem: NumberedOutlineItem = { ...item, numberedTitle };
    if (item.children && item.children.length > 0) {
      newItem.children = generateNumberedDisplayOutline(item.children, `${currentNumber}.`);
    }
    return newItem;
  });
}