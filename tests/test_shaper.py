"""Shaper tests: keep X-style unlabeled formats, still drop junk."""

from app.ytdlp_service import _shape_format


def test_audio_with_unparsed_codecs_kept():
    f = _shape_format({"format_id": "hls-audio-64000-Audio", "ext": "mp4",
                       "protocol": "m3u8_native", "vcodec": None, "acodec": None,
                       "tbr": 64})
    assert f is not None
    assert f["kind"] == "audio"


def test_audio_ext_with_unparsed_codecs_kept():
    f = _shape_format({"format_id": "bestaudio", "ext": "m4a",
                       "protocol": "https", "vcodec": None, "acodec": None})
    assert f is not None
    assert f["kind"] == "audio"


def test_unknown_video_container_kept_as_video():
    f = _shape_format({"format_id": "http-832", "ext": "mp4",
                       "protocol": "https", "vcodec": None, "acodec": None,
                       "tbr": 832})
    assert f is not None
    assert f["kind"] == "video"
    # Unknown codecs must NOT trigger a forced audio merge downstream:
    # they download as-is (frontend checks acodec == "none").
    assert f["acodec"] != "none"


def test_truly_empty_format_dropped():
    assert _shape_format({"format_id": "sb0", "ext": "mhtml",
                          "protocol": "mhtml", "vcodec": None,
                          "acodec": None}) is None
    assert _shape_format({"format_id": "x", "ext": "bin",
                          "protocol": "https", "vcodec": None,
                          "acodec": None}) is None
    assert _shape_format({"format_id": "", "ext": "mp4",
                          "protocol": "https", "vcodec": "avc1",
                          "acodec": "mp4a"}) is None
