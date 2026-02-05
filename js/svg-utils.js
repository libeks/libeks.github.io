function toTransform(offsetVect) {
  if (offsetVect.rotate) {
    return {
      transform: `translate(${offsetVect.x}px,${offsetVect.y}px) rotate(${offsetVect.rotate}deg)`,
    }
  }
  return {
    transform: `translate(${offsetVect.x}px,${offsetVect.y}px)`,
  }
}

export { toTransform }
