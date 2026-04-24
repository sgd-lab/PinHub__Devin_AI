export async function provisionNotionDatabase(
  notionToken: string,
  parentPageId: string,
  brandName: string
): Promise<{ success: boolean; databaseId?: string; error?: string }> {
  try {
    const response = await fetch("https://api.notion.com/v1/databases", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ text: { content: `PinHub — ${brandName} Content Library` } }],
        properties: {
          Title: { title: {} },
          Description: { rich_text: {} },
          Hashtags: { multi_select: { options: [] } },
          "Prompt A": { rich_text: {} },
          "Prompt B": { rich_text: {} },
          Niche: {
            select: {
              options: [
                { name: "Quiet Luxury Workwear", color: "brown" },
                { name: "Weekend Capsule", color: "green" },
                { name: "Evening Edit", color: "yellow" },
              ],
            },
          },
          "Target Date": { date: {} },
          Status: {
            status: {
              options: [
                { name: "Draft", color: "default" },
                { name: "Approved", color: "blue" },
                { name: "Posted", color: "green" },
                { name: "Archived", color: "gray" },
              ],
              groups: [
                { name: "To do", option_ids: [], color: "gray" },
                { name: "In progress", option_ids: [], color: "blue" },
                { name: "Complete", option_ids: [], color: "green" },
              ],
            },
          },
          Board: { select: { options: [] } },
          "QC Pass": { checkbox: {} },
          "Run ID": { rich_text: {} },
          Brand: { select: { options: [] } },
          "Guide Link": { url: {} },
          "Cost Estimate": { number: { format: "dollar" } },
          "Model Used": { select: { options: [] } },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, databaseId: data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
