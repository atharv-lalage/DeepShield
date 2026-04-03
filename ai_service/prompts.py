def build_prompt(media_type: str, ai_result: dict) -> str:
    label      = ai_result.get("label", "unknown")
    confidence = ai_result.get("confidence", 0)
    pct        = f"{confidence * 100:.1f}"

    if media_type == "image":
        breakdown     = ai_result.get("ensemble_breakdown", {})
        vit_fake_prob = breakdown.get("vit_fake_prob", "N/A")
        sig_fake_prob = breakdown.get("siglip_fake_prob", "N/A")
        return f"""You are a deepfake detection expert. An AI ensemble analyzed an image.
Result: {label.upper()} ({pct}% confidence)
ViT model fake probability: {vit_fake_prob}
SigLIP model fake probability: {sig_fake_prob}

Write 2-3 sentences explaining this result to a non-technical user. Be direct about whether the image is real or fake, mention the confidence level, and briefly explain what the ensemble agreement means. Do not use bullet points."""

    if media_type == "audio":
        breakdown  = ai_result.get("breakdown", {})
        prob_real  = breakdown.get("prob_real", "N/A")
        prob_fake  = breakdown.get("prob_fake", "N/A")
        return f"""You are a deepfake detection expert. An AI model analyzed an audio clip.
Result: {label.upper()} ({pct}% confidence)
Probability real: {prob_real}
Probability fake: {prob_fake}

Write 2-3 sentences explaining this result to a non-technical user. Be direct about whether the audio is real or AI-generated, and mention the confidence level. Do not use bullet points."""

    if media_type == "video":
        summary              = ai_result.get("frame_summary", {})
        total_frames         = summary.get("total_frames_analyzed", "N/A")
        fake_frames          = summary.get("fake_frames", "N/A")
        real_frames          = summary.get("real_frames", "N/A")
        fake_ratio           = summary.get("fake_ratio", 0)
        avg_fake_score       = summary.get("avg_fake_score", "N/A")
        return f"""You are a deepfake detection expert. An AI system analyzed {total_frames} frames from a video.
Result: {label.upper()} ({pct}% confidence)
Fake frames: {fake_frames} / {total_frames} ({fake_ratio * 100:.1f}%)
Real frames: {real_frames}
Average fake score across frames: {avg_fake_score}

Write 2-3 sentences explaining this result to a non-technical user. Mention how many frames were flagged and what that means for the overall verdict. Do not use bullet points."""

    return f"A deepfake detection system analyzed a {media_type} file and returned: {label.upper()} with {pct}% confidence. Explain this result in 2-3 sentences for a non-technical user."