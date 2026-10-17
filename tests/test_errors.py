"""Friendly-error mapping tests: raw engine text becomes actionable messages."""

from app.ytdlp_service import _friendly_error


def test_no_video_tweet():
    msg = _friendly_error(Exception(
        "ERROR: [twitter] 2099552824929489226: No video could be found in this tweet"))
    assert "no video" in msg.lower()
    assert "twitter" not in msg.lower() or "post" in msg.lower()


def test_rate_limit():
    assert "rate-limit" in _friendly_error(Exception("ERROR: Rate limit exceeded")).lower()


def test_expired_format_kept():
    msg = _friendly_error(Exception("ERROR: Requested format is not available"))
    assert "expired" in msg.lower()
