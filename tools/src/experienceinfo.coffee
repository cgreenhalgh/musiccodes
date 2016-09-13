# generate summary information for experience files
# see headings for outputs

fs = require 'fs'

if process.argv.length <= 2
  console.error 'usage: coffee experienceinfo <experience-files> ...'
  console.error 'Writes output to stdout as CSV'
  process.exit 0
  
headings = ['file','input','filters','nprofiles','profiles','ncodes','codes','nwildcards','ninexact','errors','actions','actiontypes','nchannels','channels','state','npreconditions','preconditions','nexamples']

outrow = ( els ) ->
  out = ''
  for ei in [0 .. els.length-1]
    if ei > 0
      out += ','
    el = String els[ei]
    if el? and ((el.indexOf ',') >= 0 or (el.indexOf '"') >= 0)
      # escape
      out += '"'
      for ci in [0 .. el.length]
        c = el.charAt(ci)
        switch c
          when '"' then out += '""'
          else out += c
      out += '"'
    else
      out += el
  console.log out
  
outrow headings

wildcards = ['.','*','+','{']
actiontypes = 
  midi: 'data:text/x-midi-hex'
  osc: 'osc.udp:'
  text: 'data:text/plain'

# return info object
getinfo = ( exp ) ->
  info = {}
  # headings = ['file','input','filters','nprofiles','profiles','ncodes','nwildcards','wildcards','ninexact','errors','codes','nexamples','actions','nchannels','channels','state','npreconditions','preconditions']
  # input
  if exp.parameters?.midiInput?
    info.input = 'midi('+exp.parameters.midiInput+')'
  else 
    info.input = 'audio(' + (exp.parameters.audioInput ? 'default') + '/' + (exp.parameters.audioChannel ? 0) + ')'
  # filters
  info.filters = ''+
    (if (exp.parameters.frequencyRatio?) then 'frequencyRatio('+exp.parameters.frequencyRatio+') ' else '')+
    (if (exp.parameters.minFrequency?) then 'minFrequency('+exp.parameters.minFrequency+') ' else '')+
    (if (exp.parameters.maxFrequency?) then 'maxFrequency('+exp.parameters.maxFrequency+') ' else '')+
    (if (exp.parameters.minVelocity?) then 'minVelocity('+exp.parameters.minVelocity+') ' else '')+
    (if (exp.parameters.maxVelocity?) then 'maxVelocity('+exp.parameters.maxVelocity+') ' else '')
  # profiles
  if exp.projections?
    info.nprofiles = exp.projections.length
    info.profiles = (proj.id for proj in exp.projections).join ' '
  else
    info.nprofiles = 0
    info.profiles = ''
  # codes
  info.ncodes = info.nwildcards = info.ninexact = info.npreconditions = info.nchannels = 0
  info.codes = []
  info.actions = []
  info.errors = []
  info.channels = []
  info.preconditions = []
  info.wildcards = []
  info.actiontypes = []
  for marker in (exp.markers ? [])
    code = marker.code
    if marker.projection?
      code = marker.projection+':'+code
    else if marker.codeformat?
      # v.1
      code = marker.codeformat+':'+code
    info.ncodes++
    if (info.codes.indexOf code) < 0
      info.codes.push code

    wc = false
    for wildcard in wildcards
      if (code.indexOf wildcard) >= 0
        if (info.wildcards.indexOf wildcard)<0
          info.wildcards.push wildcard
        wc = true
    if wc
      info.nwildcards++      

    if marker.inexact
      info.ninexact++
      info.errors.push marker.inexactError ? 0          
      
    if marker.precondition?
      info.npreconditions++
      if (info.preconditions.indexOf marker.precondition) < 0
        info.preconditions.push marker.precondition
    
    actions = []
    if marker.action?
      actions.push marker.action
      
    if marker.actions?
      for action in marker.actions
        if action.url?
          actions.push action.url
        channel = action.channel ? '(default)'
        if (info.channels.indexOf channel)<0
          info.channels.push channel
          info.nchannels++

    for action in actions
      if (info.actions.indexOf action)<0
        info.actions.push action
        actiontype = 'http'
        if (action.indexOf ':')>=0
          actiontype = action.substring 0, (action.indexOf ':')
          
        for key,val of actiontypes
          if (action.indexOf val)==0
            actiontype = key
         
         if (info.actiontypes.indexOf actiontype)<0
           info.actiontypes.push actiontype
        
          
  info.codes = info.codes.sort().join ' '
  info.actions = info.actions.sort().join ' '
  info.preconditions = info.preconditions.sort().join ' '
  info.errors  = info.errors.sort().join ' '
  info.channels = info.channels.sort().join ' '
  info.wildcards = info.wildcards.sort().join ' '
  info.actiontypes = info.actiontypes.sort().join ' '
  
  
  # state
  info.state = (key for key,val of (exp.parameters?.initstate ? {})).sort().join ' '
  
  if exp.examples?.length?
    info.nexamples = exp.examples?.length
  else
    info.nexamples = 0
  
  info
    
for ai in [2 .. process.argv.length-1]
  filename = process.argv[ai]
  text = null
  json = null
  try 
    text = fs.readFileSync filename, encoding:'utf8'
  catch err
    console.error 'Error reading '+filename+': '+err.message
    continue
  try
    json = JSON.parse text
  catch err
    console.error 'Error parsing '+filename+': '+err.message
    continue
  info = getinfo json
  info.file = filename
  
  res = []
  for h in headings
    res.push info[h]
  outrow res
  
