"""Turn an uploaded picture into a small, safe, metadata-free JPEG."""

from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 25_000_000  # refuse "decompression bombs" (tiny files that unpack to huge images)
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
SIZE = 256  # pixels, square


class ImageRejected(Exception):
    pass


def process_avatar(data: bytes) -> bytes:
    """Validate by actually decoding the bytes (the browser's claimed file type is never trusted),
    straighten phone photos, crop to a square, and re-encode.

    Re-encoding from raw pixels drops everything else in the file, including EXIF data such as
    the GPS location a phone can embed in photos.
    """
    try:
        image = Image.open(BytesIO(data))
        if image.format not in ALLOWED_FORMATS:
            raise ImageRejected("format")
        image.load()  # decode everything now, so broken files fail here
        image = ImageOps.exif_transpose(image)  # apply the phone's rotation before it is dropped
    except ImageRejected:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as err:
        raise ImageRejected("unreadable") from err

    rgba = image.convert("RGBA")
    flat = Image.new("RGB", rgba.size, (255, 255, 255))  # transparent areas become white
    flat.paste(rgba, mask=rgba.getchannel("A"))
    square = ImageOps.fit(flat, (SIZE, SIZE), Image.Resampling.LANCZOS)

    out = BytesIO()
    square.save(out, format="JPEG", quality=85, optimize=True)
    return out.getvalue()
