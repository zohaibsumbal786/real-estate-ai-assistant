import { config } from "../config.js";

type SendWhatsAppTextInput = {
  phoneNumberId: string;
  to: string;
  body: string;
};

type SendWhatsAppMediaInput = {
  phoneNumberId: string;
  to: string;
  mediaType: "image" | "document" | "audio" | "video";
  mediaUrl: string;
  caption?: string;
};

interface MetaMessageResponse {
  messages: Array<{ id: string }>;
  contacts: Array<{ input: string; wa_id: string }>;
}

export async function sendWhatsAppText(
  input: SendWhatsAppTextInput
): Promise<{ success: boolean; providerMessageId?: string; mocked?: boolean; error?: string }> {
  // If no access token configured, mock the response
  if (!config.META_APP_SECRET || config.META_APP_SECRET.startsWith("local-")) {
    const mockProviderId = `mock-meta-${Date.now()}`;
    console.log("[Meta Cloud API mock] outgoing WhatsApp message", {
      phoneNumberId: input.phoneNumberId,
      to: input.to,
      body: input.body,
      providerMessageId: mockProviderId
    });
    return {
      success: true,
      providerMessageId: mockProviderId,
      mocked: true
    };
  }

  try {
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${input.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.META_APP_SECRET}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to,
          type: "text",
          text: {
            preview_url: true,
            body: input.body
          }
        })
      }
    );

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      const errorMsg = error.error?.message || `HTTP ${response.status}`;
      console.error("[Meta Cloud API error] Failed to send message", { status: response.status, error: errorMsg });
      return {
        success: false,
        error: errorMsg
      };
    }

    const data = (await response.json()) as MetaMessageResponse;
    const messageId = data.messages[0]?.id || "";

    console.log("[Meta Cloud API] Message sent successfully", { to: input.to, messageId });

    return {
      success: true,
      providerMessageId: messageId,
      mocked: false
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Meta Cloud API] Error sending message:", errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

export async function sendWhatsAppMedia(input: SendWhatsAppMediaInput) {
  // If no access token configured, mock the response
  if (!config.META_APP_SECRET || config.META_APP_SECRET.startsWith("local-")) {
    const mockProviderId = `mock-meta-${Date.now()}`;
    console.log("[Meta Cloud API mock] outgoing WhatsApp media", {
      phoneNumberId: input.phoneNumberId,
      to: input.to,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      providerMessageId: mockProviderId
    });
    return {
      providerMessageId: mockProviderId,
      mocked: true
    };
  }

  try {
    const mediaPayload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to,
      type: input.mediaType,
      [input.mediaType]: {
        link: input.mediaUrl
      }
    };

    if (input.caption && ["image", "document", "video"].includes(input.mediaType)) {
      mediaPayload[input.mediaType].caption = input.caption;
    }

    const response = await fetch(
      `https://graph.instagram.com/v18.0/${input.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.META_APP_SECRET}`
        },
        body: JSON.stringify(mediaPayload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[Meta Cloud API error] Failed to send media", error);
      throw new Error(`Meta API error: ${error.error.message}`);
    }

    const data = (await response.json()) as MetaMessageResponse;
    const messageId = data.messages[0]?.id || "";

    console.log("[Meta Cloud API] Media sent successfully", {
      to: input.to,
      mediaType: input.mediaType,
      messageId
    });

    return {
      providerMessageId: messageId,
      mocked: false
    };
  } catch (error) {
    console.error("[Meta Cloud API] Error sending media:", error);
    throw error;
  }
}
