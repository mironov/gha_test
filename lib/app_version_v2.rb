# frozen_string_literal: true

require "highline"
require "pathname"
# require_relative "../app/lib/command_runner"

class AppVersionV2
  class NotIncrementalError < StandardError; end

  CONTAINER_START = Time.now

  # def self.build(sync_repo: true)
  #   ui = HighLine.new
  #
  #   ap("[WARNING] Check twice before doing this in #{current_branch}, usually this should be done in a release branch") unless is_release_branch?
  #   ap("This script is going to rebase from master, update the version.yml file, push #{current_branch} to Github and initiate a build on PodManager")
  #   return true if ui.ask("are you sure you want to continue? yes/no").downcase != "yes"
  #
  #   rebase_off_master!
  #
  #   level, urgency, name, link = display_prompt
  #   return true if level.nil?
  #
  #   increment!(level: level, urgency: urgency)
  #   commit!(sync_repo: sync_repo, name: name, link: link)
  # end
  #
  # def self.release
  #   ui = HighLine.new
  #
  #   ap("===Release branch process===")
  #   unless is_release_branch?
  #     ap("[ERROR] There is a Github branch protection that enforces release branch name")
  #     ap("#{current_branch} doesn't follow release branch naming convention 'release-<ticket-name>'")
  #     ap("try: ")
  #     ap("    git checkout -b release-<ticket-name>")
  #     ap("    git push")
  #     ap("")
  #     ap("  ..wait for CI to pass..")
  #     ap("")
  #     ap("    bundle exec rake version:merge")
  #     return
  #   end
  #
  #   ap("This script is going to merge #{current_branch} branch into master and tag it with the current version")
  #
  #   return true if ui.ask("are you sure you want to continue? yes/no").downcase != "yes"
  #
  #   git_tag!
  #   merge_to_master!
  # end

  def self.increment!(urgency: nil, level: :patch)
    v = new
    v.increment(urgency: urgency, level: level)
    v.save
    clear_cache
    v.current
  end

  # def self.rebase_off_master!
  #   begin
  #     command = "git rebase origin/master"
  #     CommandRunner.run(command)
  #   rescue CommandRunner::ExecutionFailed
  #     raise "unable to rebase off master, please let the next team deploy while this conflict is resolved"
  #   end
  #   ap("rebased from master")
  # end
  #
  # def self.merge_to_master!
  #   release_branch = current_branch
  #   begin
  #     command = "git checkout master && git reset --hard #{release_branch} && git push --follow-tags"
  #     CommandRunner.run(command)
  #   rescue CommandRunner::ExecutionFailed
  #     raise "unable to sync with the remote repo, has this version tag already been created on master?"
  #   end
  #   ap("#{release_branch} successfully merged to master")
  # end

  # def self.commit!(sync_repo: false, name: nil, link: nil)
  #   v = current
  #   message = "Release #{v}"
  #
  #   if name.present?
  #     message += " - #{name}"
  #   end
  #
  #   message2 = ""
  #   if link.present?
  #     message2 = " -m \"#{Shellwords.shellescape(link)}\""
  #   end
  #
  #   version = v.split(":").first # => "4.10.11"
  #   begin
  #     command = "git commit -m \"#{Shellwords.shellescape(message)}\"#{message2} #{Shellwords.shellescape(new.version_file)}"
  #     CommandRunner.run(command)
  #   rescue CommandRunner::ExecutionFailed
  #     raise "cannot commit version file"
  #   end
  #   begin
  #     command = "git tag -a v#{version}-rc-#{git_sha} -m '#{message}'"
  #     CommandRunner.run(command)
  #   rescue CommandRunner::ExecutionFailed
  #     raise "cannot tag release"
  #   end
  #   ap(message)
  #
  #   if sync_repo
  #     begin
  #       command = "git push -f --follow-tags"
  #       CommandRunner.run(command)
  #     rescue CommandRunner::ExecutionFailed
  #       raise "unable to sync with the remote repo"
  #     end
  #     ap("github repo synced")
  #   end
  # end
  #
  # def self.git_tag!
  #   v       = AppVersion.current
  #   message = "Release #{v}"
  #   version = v.split(":").first # => "4.10.11"
  #   begin
  #     command = "git tag -a v#{version} -m '#{message}'"
  #     CommandRunner.run(command)
  #   rescue CommandRunner::ExecutionFailed
  #     raise "cannot tag release"
  #   end
  # end

  # def self.current_for_bugsnag
  #   ENV["APP_VERSION"] || git_version.presence || current
  # end
  #
  # def self.git_version
  #   `git describe --tags --long`.chomp
  # end
  #
  # def self.git_sha
  #   `git rev-parse --short HEAD`.chomp
  # end

  def self.current
    @current_version ||= new.current
  end

  def self.is_master_branch?
    current_branch == "master"
  end

  def self.is_release_branch?
    current_branch.downcase.start_with?("release")
  end

  def self.clear_cache
    @current_version = nil
    @all = nil
  end

  def self.all
    @all ||= new.all
  end

  def self.refresh_notice_delay
    ENV["refresh_notice_delay"].present? ? ENV["refresh_notice_delay"].to_i.minutes : 10.minutes
  end

  def self.issue_refresh_notice?
    # wait for containers to propagate before issuing refresh notice
    Time.now > CONTAINER_START + AppVersion.refresh_notice_delay
  end

  # def self.compatibility_level(version)
  #   return "unsupported" if version.blank?
  #
  #   begin
  #     front_end_version = Gem::Version.new(version)
  #   rescue ArgumentError
  #     return "latest"
  #   end
  #
  #   stored_versions = all
  #
  #   unless AppVersion.issue_refresh_notice?
  #     Jane.log.info("[AppVersion] - skipping refresh notice until 10 minutes after container start")
  #     return "latest"
  #   end
  #
  #   # don't issue a refresh notice because this server is still serving a "bad" version of the client
  #   return "bad" if Jane.config.app.bad_versions.try(:include?, AppVersion.current)
  #
  #   # if server isn't serving a bad client, let users know they're on a "broken" version so they can refresh
  #   return "broken" if Jane.config.app.bad_versions.try(:include?, version)
  #
  #   return "unsupported" if front_end_version < Gem::Version.new(stored_versions[:minimum])
  #   return "deprecated" if front_end_version < Gem::Version.new(stored_versions[:immediate])
  #   return "outdated" if front_end_version < Gem::Version.new(stored_versions[:unobtrusive])
  #   return "compatible" if front_end_version < Gem::Version.new(stored_versions[:current])
  #
  #   "latest"
  # end

  attr_reader :version_file, :versions
  attr_accessor :current, :unobtrusive, :immediate, :minimum

  require "pathname"

  def initialize(options = {})
    @version_file = options[:version_file] || Pathname.new(Dir.pwd).join("version.yaml")
    load_from_disk
  end

  def all
    {
      current: current,
      unobtrusive: unobtrusive,
      immediate: immediate,
      minimum: minimum,
    }
  end

  def increment(level: :patch, urgency: nil)
    self.current = update_version_parts(level)
    set_urgency(urgency)

    current
  end

  def save
    File.open(version_file, "w") { |file| file.write(current_to_yaml) }
  end

  private

  def update_version_parts(level)
    major, minor, patch = current.split(".").map(&:to_i)

    case level
    when :major
      major += 1
      minor = 0
      patch = 0
    when :minor
      minor += 1
      patch = 0
    when :patch
      patch += 1
    end

    [major, minor, patch].join(".")
  end

  def set_urgency(urgency)
    case urgency
    when :unobtrusive
      self.unobtrusive = current
    when :immediate
      self.immediate = current
    end
  end

  def current_to_yaml
    { version: all }.to_yaml
  end

  def load_from_disk
    if File.file?(version_file)
      yaml = YAML.load_file(version_file)
    else
      yaml = default
    end

    versions         = yaml[:version]
    self.current     = versions[:current]
    self.unobtrusive = versions[:unobtrusive]
    self.immediate   = versions[:immediate]
    self.minimum     = versions[:minimum]
  end

  def default
    {
      version: {
        current: "1.0.0",
        unobtrusive: "1.0.0",
        immediate: "1.0.0",
        minimum: "1.0.0",
      },
    }
  end

#   def self.display_prompt
#     ui = HighLine.new
#
#     major = new.increment(level: :major)
#     minor = new.increment(level: :minor)
#     patch = new.increment(level: :patch)
#
#     level_prompt = <<-EOF
# What version are we bumping to?
# 1. Major #{major}
# 2. Minor #{minor}
# 3. Patch #{patch}
# 4. No bump
#
# Enter [1,2,3 or 4]:
# EOF
#
#     level = case ui.ask(level_prompt).to_i
#             when 1
#               :major
#             when 2
#               :minor
#             when 3
#               :patch
#             when 4
#               nil
#             else
#               ap("unknown input")
#               raise NotIncrementalError
#     end
#
#     return nil, nil if level.nil?
#
#     name = ui.ask("Does this release have a name? Ex. Seymour")
#     link = ui.ask("Does this release have a release notes url?")
#
#     mode_prompt = <<-EOF
# Should we notify users to refresh? How urgently?
# 1. Notify users to refresh ASAP ("immediate")
# 2. Notify users to refresh at their convenience ("unobtrusive")
# 3. No refresh required
#
# Enter [1,2, or 3]:
# EOF
#
#     urgency = case ui.ask(mode_prompt).to_i
#               when 1
#                 :immediate
#               when 2
#                 :unobtrusive
#               when 3
#                 :none
#               else
#                 ap("unknown mode: '#{mode}'")
#                 raise NotIncrementalError
#     end
#
#     diff_output = `git diff --shortstat`
#
#     if diff_output.lines.any?
#       ap("you have uncommited changes.")
#       ap("=================")
#       ap(`git status --short`)
#       ap("=================")
#       response = ui.ask("continue anyways? (y/n)")
#       if response[0].downcase != "y"
#         raise NotIncrementalError
#       end
#     end
#
#     [level, urgency, name, link]
#   end

  # def self.current_branch
  #   `git branch --show-current`.chomp
  # end

end
