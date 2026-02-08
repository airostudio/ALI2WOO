import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Use OpenAI to optimize the title for SEO and AI search
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO copywriter specializing in e-commerce product titles.

Your task is to rewrite product titles to be:
1. SEO-friendly with relevant keywords
2. Optimized for AI search engines (ChatGPT, Perplexity, etc.)
3. Clear and descriptive
4. Under 70 characters
5. Include key features and benefits
6. Natural and readable (not keyword-stuffed)

Rules:
- Remove excessive capitalization
- Remove spam words like "HOT", "SALE", "FREE SHIPPING"
- Include important specifications (size, color, material, etc.) if mentioned
- Use proper grammar and punctuation
- Make it customer-focused
- Keep brand names if present

Return ONLY the optimized title, nothing else.`,
        },
        {
          role: 'user',
          content: title,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const optimizedTitle =
      completion.choices[0]?.message?.content?.trim() || title;

    return NextResponse.json({
      originalTitle: title,
      optimizedTitle,
    });
  } catch (error) {
    console.error('AI title optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize title' },
      { status: 500 }
    );
  }
}
